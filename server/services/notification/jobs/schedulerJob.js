const { QUEUES } = require('../queues');
const { calculateTimeToNextMedication, calculateTimeToNextMeal } = require('../utils/timeUtils');
const { User, ActivitySession, UserProfile, Medication } = require("@dtwin/shared-database");
const { Sequelize } = require("sequelize");
const timezoneUtils = require('../../../common/utils/timezone');
const { logger, info, errorLog, warn, debug } = require('@dtwin/config');
const { redisClient } = require('@dtwin/config/config/cache');

const scheduleMedicationReminders = async (queues, user) => {
  const { id, medications } = user;
  if (!medications || !Array.isArray(medications)) {
    info(`No medications found for user ${id}`);
    return;
  }
  info(`Scheduling ${medications.length} medication reminders for user ${id}`);
  
  // Check for existing jobs before adding new ones to prevent duplicates
  let existingJobs = [];
  try {
    // Get all waiting and delayed jobs in the queue
    existingJobs = await queues[QUEUES.MEDICATION_REMINDER].getJobs(['waiting', 'delayed']);
    info(`Found ${existingJobs.length} existing medication reminder jobs in queue`);
  } catch (err) {
    warn(`Error getting existing medication jobs: ${err.message}`);
  }
  
  let scheduledCount = 0;
  
  for (const medication of medications) {
    const { name, dosage, times } = medication;
    if (!times || !Array.isArray(times)) continue;
    for (const time of times) {
      const delayMs = calculateTimeToNextMedication(time);
      if (delayMs > 0) {
        // Create a unique tracking key for this medication notification
        const trackingKey = `medication:${id}:${name}:${time}:${new Date().toDateString()}`;
        
        // Skip if already scheduled in this run
        if (!trackScheduledNotification(trackingKey)) {
          debug(`Skipping already scheduled medication reminder: ${trackingKey}`);
          continue;
        }
        
        // Use atomic deduplication with Redis SETNX
        const deduplicationKey = `notification:schedule:med:${id}:${name}:${time}`;
        const lockTTL = 120; // 2 minutes
        let lockAcquired = false;
        try {
          lockAcquired = await redisClient.set(deduplicationKey, '1', 'EX', lockTTL, 'NX');
          info(`[Deduplication][Scheduler] SETNX for medication job key: ${deduplicationKey}, result: ${lockAcquired}`);
        } catch (err) {
          warn(`[Deduplication][Scheduler] Redis error for key ${deduplicationKey}: ${err.message}`);
        }
        if (lockAcquired !== 'OK') {
          debug(`Skipping duplicate medication reminder for user ${id} at ${time} - deduplication lock not acquired`);
          continue;
        }
        
        await queues[QUEUES.MEDICATION_REMINDER].add(
          'medication',
          {
            userId: id,
            medicationName: name,
            dosage,
            scheduledTime: time,
            // Set delivery preference to avoid duplicate notifications via multiple channels
            deliveryPreference: 'websocket-first' // Try WebSocket first, fall back to FCM
          },
          {
            delay: delayMs,
            removeOnComplete: true,
            jobId: `med:${id}:${name}:${time}:${Date.now()}`  // Add unique jobId to prevent duplicates
          }
        );
        scheduledCount++;
        info(`Scheduled medication reminder for user ${id} at ${time} (in ${delayMs / 1000 / 60} minutes)`);
      }
    }
  }
  
  info(`Scheduled ${scheduledCount} medications for user ${id}`);
};

const scheduleMealReminders = async (queues, user) => {
  const { id, meals } = user;
  if (!meals || Object.keys(meals).length === 0) {
    info(`No meals found for user ${id}`);
    return;
  }
  info(`Scheduling meal reminders for user ${id}`);
  
  // Check for existing jobs before adding new ones to prevent duplicates
  let existingJobs = [];
  try {
    // Get all waiting and delayed jobs in the queue
    existingJobs = await queues[QUEUES.MEAL_REMINDER].getJobs(['waiting', 'delayed']);
    info(`Found ${existingJobs.length} existing meal reminder jobs in queue`);
  } catch (err) {
    warn(`Error getting existing meal jobs: ${err.message}`);
  }
  
  let scheduledCount = 0;
  
  for (const [mealType, time] of Object.entries(meals)) {
    const delayMs = calculateTimeToNextMeal(time);
    if (delayMs > 0) {
      // Create a unique tracking key for this meal notification
      const trackingKey = `meal:${id}:${mealType}:${time}:${new Date().toDateString()}`;
      
      // Skip if already scheduled in this run
      if (!trackScheduledNotification(trackingKey)) {
        debug(`Skipping already scheduled meal reminder: ${trackingKey}`);
        continue;
      }
      
      // Use atomic deduplication with Redis SETNX
      const deduplicationKey = `notification:schedule:meal:${id}:${mealType}:${time}`;
      const lockTTL = 120; // 2 minutes
      let lockAcquired = false;
      try {
        lockAcquired = await redisClient.set(deduplicationKey, '1', 'EX', lockTTL, 'NX');
        info(`[Deduplication][Scheduler] SETNX for meal job key: ${deduplicationKey}, result: ${lockAcquired}`);
      } catch (err) {
        warn(`[Deduplication][Scheduler] Redis error for key ${deduplicationKey}: ${err.message}`);
      }
      if (lockAcquired !== 'OK') {
        debug(`Skipping duplicate meal reminder for user ${id} at ${time} - deduplication lock not acquired`);
        continue;
      }
      
      await queues[QUEUES.MEAL_REMINDER].add(
        'meal',
        {
          userId: id,
          mealType,
          scheduledTime: time,
          // Set delivery preference to avoid duplicate notifications via multiple channels
          deliveryPreference: 'websocket-first' // Try WebSocket first, fall back to FCM
        },
        {
          delay: delayMs,
          removeOnComplete: true,
          jobId: `meal:${id}:${mealType}:${Date.now()}`  // Add unique jobId to prevent duplicates
        }
      );
      scheduledCount++;
      info(`Scheduled ${mealType} reminder for user ${id} at ${time} (in ${delayMs / 1000 / 60} minutes)`);
    }
  }
  
  info(`Scheduled ${scheduledCount} meal reminders for user ${id}`);
};

const scheduleActivityChecks = async (queues) => {
  const ACTIVITY_CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes
  const INACTIVITY_THRESHOLD_HOURS = 2; // 2 hours
  const NOTIFICATION_COOLDOWN_HOURS = 4; // Don't send more than 1 activity notification per 4 hours
  
  try {
    const users = await User.findAll({
      attributes: ['userId']
    });
    
    const now = timezoneUtils.getCurrentIST();
    info(`Checking activity for ${users.length} users`);
    
    for (const user of users) {
      try {
        // Check if we've already sent an activity notification recently
        const activityNotificationKey = `activity_notification:${user.userId}`;
        const lastNotified = await redisClient.get(activityNotificationKey);
        
        if (lastNotified) {
          const hoursSinceLastNotification = (now - new Date(parseInt(lastNotified))) / (1000 * 60 * 60);
          if (hoursSinceLastNotification < NOTIFICATION_COOLDOWN_HOURS) {
            info(`Skipping activity check for user ${user.userId} - already notified ${hoursSinceLastNotification.toFixed(1)} hours ago`);
            continue;
          }
        }
        
        // Use the Activity model instead of ActivitySession
        // And use Sequelize methods instead of raw SQL
        const latestActivity = await ActivitySession.findOne({
          attributes: ['created_at', 'activity_type', 'end_time'],
          where: { 
            userId: user.userId 
          },
          order: [['created_at', 'DESC']],
          raw: true
        });
        
        if (!latestActivity) {
          info(`No activity records found for user ${user.userId}, scheduling first-time check`);
          
          // Create tracking key
          const trackingKey = `activity:${user.userId}:firsttime:${new Date().toDateString()}`;
          
          // Skip if already scheduled in this run
          if (!trackScheduledNotification(trackingKey)) {
            debug(`Skipping already scheduled first-time activity check: ${trackingKey}`);
            continue;
          }
          
          await queues[QUEUES.ACTIVITY_CHECK].add(
            'activity',
            {
              userId: user.userId,
              lastActivityAt: null,
              inactiveHours: INACTIVITY_THRESHOLD_HOURS,
              firstTimeCheck: true,
              // Set delivery preference
              deliveryPreference: 'websocket-first'
            },
            {
              removeOnComplete: true,
              jobId: `activity:${user.userId}:firsttime:${Date.now()}`
            }
          );
          
          // Set cooldown in Redis
          await redisClient.set(activityNotificationKey, Date.now().toString(), 'EX', NOTIFICATION_COOLDOWN_HOURS * 60 * 60);
          continue;
        }
        
        const lastActivity = new Date(latestActivity.created_at);
        
        // If there's an end_time, use that instead (for completed activities)
        const lastActiveTime = latestActivity.end_time ? new Date(latestActivity.end_time) : lastActivity;
        
        const hoursSinceActivity = (now - lastActiveTime) / (1000 * 60 * 60);
        
        info(`User ${user.userId} last active ${hoursSinceActivity.toFixed(1)} hours ago`);
        
        if (hoursSinceActivity >= INACTIVITY_THRESHOLD_HOURS) {
          info(`Scheduling activity reminder for user ${user.userId} (inactive for ${Math.floor(hoursSinceActivity)} hours)`);
          
          // Create tracking key
          const trackingKey = `activity:${user.userId}:${Math.floor(hoursSinceActivity)}:${new Date().toDateString()}`;
          
          // Skip if already scheduled in this run
          if (!trackScheduledNotification(trackingKey)) {
            debug(`Skipping already scheduled activity check: ${trackingKey}`);
            continue;
          }
          
          await queues[QUEUES.ACTIVITY_CHECK].add(
            'activity',
            {
              userId: user.userId,
              lastActivityAt: lastActiveTime.toISOString(),
              inactiveHours: Math.floor(hoursSinceActivity),
              activityType: latestActivity.activity_type || 'unknown',
              // Set delivery preference
              deliveryPreference: 'websocket-first'
            },
            {
              removeOnComplete: true,
              jobId: `activity:${user.userId}:${Math.floor(hoursSinceActivity)}:${Date.now()}`
            }
          );
          
          // Set cooldown in Redis
          await redisClient.set(activityNotificationKey, Date.now().toString(), 'EX', NOTIFICATION_COOLDOWN_HOURS * 60 * 60);
          
          info(`Scheduled activity check for inactive user ${user.userId} (inactive for ${Math.floor(hoursSinceActivity)} hours)`);
        }
      } catch (userError) {
        errorLog(`Error processing activity for user ${user.userId}:`, userError);
      }
    }
    
    // Ensure we always schedule the next run
    info(`Scheduling next activity check in ${ACTIVITY_CHECK_INTERVAL/1000/60} minutes`);
    // setTimeout(() => scheduleActivityChecks(queues), ACTIVITY_CHECK_INTERVAL);
    
  } catch (error) {
    errorLog('Error in scheduleActivityChecks:', error);
    // Even on error, make sure we keep checking
    info(`Rescheduling activity check after error in ${ACTIVITY_CHECK_INTERVAL/1000/60} minutes`);
    // setTimeout(() => scheduleActivityChecks(queues), ACTIVITY_CHECK_INTERVAL);
  }
};

const scheduleWatchChecks = async (queues) => {
  try {
    // Use hasWatch field (false or null) to find users who have a watch but it's not connected
    // Also check wearableIntegration field to determine if watch is properly configured
    const profiles = await UserProfile.findAll({
      attributes: ['userId', 'wearableIntegration'],
      where: {
        hasWatch: true, // User has indicated they have a watch
        [Sequelize.Op.or]: [
          {
            wearableIntegration: {
              [Sequelize.Op.eq]: null // No wearable integration data
            }
          },
          {
            wearableIntegration: {
              [Sequelize.Op.eq]: {} // Empty wearable integration data
            }
          },
          {
            wearableIntegration: {
              lastSyncTime: {
                [Sequelize.Op.lt]: timezoneUtils.subtractDays(1) // Last sync more than 24 hours ago
              }
            }
          }
        ]
      },
      raw: true
    });

    info(`Found ${profiles.length} users who need to connect their watch`);

    for (const profile of profiles) {
      // Check if we've already sent a notification recently (within 12 hours)
      const key = `watch_notification:${profile.userId}`;
      const lastNotified = await redisClient.get(key);

      if (!lastNotified) {
        // Create tracking key
        const trackingKey = `watch:${profile.userId}:${new Date().toDateString()}`;
        
        // Skip if already scheduled in this run
        if (!trackScheduledNotification(trackingKey)) {
          debug(`Skipping already scheduled watch check: ${trackingKey}`);
          continue;
        }
        
        // No recent notification, add it to the queue
        await queues[QUEUES.WATCH_CHECK].add(
          'watch',
          {
            userId: profile.userId,
            wearableData: profile.wearableIntegration || {},
            // Set delivery preference
            deliveryPreference: 'websocket-first'
          },
          {
            removeOnComplete: true,
            jobId: `watch:${profile.userId}:${Date.now()}`
          }
        );

        // Set a flag that we've notified this user (expires in 12 hours)
        await redisClient.set(key, Date.now().toString(), 'EX', 12 * 60 * 60);
        
        info(`Scheduled watch check reminder for user ${profile.userId}`);
      } else {
        info(`Skipping watch reminder for user ${profile.userId} - already notified recently`);
      }
    }

    return profiles.length;
  } catch (error) {
    errorLog('Error in scheduleWatchChecks:', error);
    return 0;
  }
};

// Add a Map to track already scheduled users
const scheduledUsers = new Map();
// Add a set to track scheduled individual notification keys
const scheduledNotifications = new Set();

/**
 * Check if a notification with the same characteristics has already been scheduled
 * @param {string} key - Unique notification identifier
 * @param {number} expiryMs - Time in milliseconds before this key expires
 * @returns {boolean} - True if this is a new notification that needs scheduling
 */
const trackScheduledNotification = (key, expiryMs = 24 * 60 * 60 * 1000) => {
  if (scheduledNotifications.has(key)) {
    debug(`Skipping duplicate scheduled notification: ${key}`);
    return false;
  }
  
  scheduledNotifications.add(key);
  
  // Set timeout to remove from tracking after expiryMs
  setTimeout(() => {
    scheduledNotifications.delete(key);
  }, expiryMs);
  
  return true;
};

const scheduleAllUsersJobs = async (queues) => {
  info('Scheduling all reminder jobs...');
  try {
    // Reset scheduler tracking at the beginning of a complete scheduling run
    scheduledUsers.clear();
    // Don't clear scheduledNotifications here as it needs to persist across runs
    // to prevent duplicates when the scheduler is called multiple times

    if (!queues || !queues[QUEUES.MEDICATION_REMINDER]) {
      errorLog('Error: Required queues are not initialized properly');
      errorLog('Available queues:', Object.keys(queues || {}).join(', '));
      return;
    }
    
    // Get user profiles including meal timings
    const profiles = await UserProfile.findAll({
      attributes: ['userId', 'meal_timings', 'hasWatch', 'wearableIntegration'],
      raw: true
    });
    
    const medications = await Medication.findAll({
      attributes: ['userId', 'medicationName', 'dose', 'timings'],
      raw: true
    });
    
    const userMedications = {};
    medications.forEach(med => {
      const userId = med.userId;
      if (!userMedications[userId]) {
        userMedications[userId] = [];
      }
      const medicationTimes = Array.isArray(med.timings) ? med.timings : [];
      userMedications[userId].push({
        name: med.medicationName,
        dosage: med.dose,
        times: medicationTimes
      });
    });
    
    for (const profile of profiles) {
      const userId = profile.userId;
      
      // Skip if this user's jobs were already scheduled in this run
      if (scheduledUsers.has(userId)) {
        info(`Skipping user ${userId} - already scheduled in this run`);
        continue;
      }
      
      // Handle meal timings from profile
      const mealTimings = profile.meal_timings || {
        breakfast: "08:00",
        lunch: "13:00",
        dinner: "19:00"
      };
      
      const userData = {
        id: userId,
        userId: userId,
        medications: userMedications[userId] || [],
        meals: mealTimings, 
        hasWatch: profile.hasWatch || false,
        wearableIntegration: profile.wearableIntegration || {}
      };
      
      if (userData.medications.length > 0) {
        await scheduleMedicationReminders(queues, userData);
      }
      
      // Also schedule meal reminders
      if (Object.keys(userData.meals).length > 0) {
        await scheduleMealReminders(queues, userData);
      }
      
      // Mark user as scheduled to prevent duplicates
      scheduledUsers.set(userId, Date.now());
    }
    
    // Schedule activity checks and watch checks for all users
    // These functions have their own deduplication mechanisms
    await scheduleActivityChecks(queues);
    await scheduleWatchChecks(queues);
    
    info('Essential reminder jobs scheduled successfully');
  } catch (error) {
    errorLog('Error scheduling reminder jobs:', error);
  }
};

module.exports = {
  scheduleAllUsersJobs,
  scheduleMedicationReminders,
  scheduleMealReminders,
  scheduleActivityChecks,
  scheduleWatchChecks,
}; 