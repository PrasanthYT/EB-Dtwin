const { Queue } = require('bullmq');
const { lastActivityStore } = require('../utils/dataStore');
const { info, errorLog, debug } = require('@dtwin/config');
const { UserProfile } = require('@dtwin/shared-database');
const { Op } = require('sequelize');

/**
 * Schedule activity check notifications for users who have been inactive for a period of time
 */
const scheduleActivityChecks = async (activityQueue) => {
  try {
    if (!activityQueue) {
      const error = new Error('Activity queue is required for scheduling activity checks');
      error.code = 'MISSING_QUEUE';
      throw error;
    }
    
    info('Starting activity check scheduler...');
    
    // Get all active users
    const users = await UserProfile.findAll({
      where: {
        active: true,
        // Only include users who have opted-in to activity notifications
        // If we don't have this field yet, we'll need to add it
        notificationPreferences: {
          [Op.or]: [
            { activityReminders: true },
            { activityReminders: { [Op.eq]: null } } // Default to true if not set
          ]
        }
      },
      attributes: ['id', 'lastActivityAt', 'notificationPreferences']
    });
    
    info(`Found ${users.length} active users to check for inactivity`);
    
    let scheduledCount = 0;
    
    for (const user of users) {
      const userId = user.id;
      
      // Get last recorded activity time from database or in-memory store
      // The in-memory store is helpful for more up-to-date tracking between runs
      let lastActivityAt = user.lastActivityAt;
      const lastStored = lastActivityStore.get(userId);
      
      if (lastStored && (!lastActivityAt || new Date(lastStored) > new Date(lastActivityAt))) {
        lastActivityAt = lastStored;
      }
      
      // If no activity data, skip this user
      if (!lastActivityAt) {
        debug(`No activity data for user ${userId}, skipping activity check`);
        continue;
      }
      
      // Calculate hours since last activity
      const now = Date.now();
      const activityTime = new Date(lastActivityAt).getTime();
      const hoursSinceActivity = Math.floor((now - activityTime) / (1000 * 60 * 60));
      
      // Only schedule notifications for users inactive for 3+ hours
      // This threshold could be customized based on user preferences
      if (hoursSinceActivity >= 3) {
        try {
          // Create a unique job ID for this user's daily activity check
          // This prevents multiple jobs being created for the same user on the same day
          const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
          const jobId = `activity-check-${userId}-${today}-${hoursSinceActivity}`;
          
          // Check if we already have a pending job for this user today
          const existingJob = await activityQueue.getJob(jobId);
          
          if (existingJob) {
            debug(`Activity check job already exists for user ${userId} today, skipping`);
            continue;
          }
          
          // Schedule the activity check notification
          await activityQueue.add('user-activity-check', 
            { 
              userId, 
              lastActivityAt, 
              inactiveHours: hoursSinceActivity,
              timestamp: new Date().toISOString() 
            },
            { 
              jobId, // Use consistent jobId to prevent duplicates
              removeOnComplete: true,
              removeOnFail: true,
              attempts: 2
            }
          );
          
          scheduledCount++;
          debug(`Scheduled activity check for user ${userId} - inactive for ${hoursSinceActivity} hours`);
        } catch (err) {
          errorLog(`Failed to schedule activity check for user ${userId}: ${err}`);
        }
      }
    }
    
    info(`Activity check scheduled for ${scheduledCount} inactive users`);
    return scheduledCount;
  } catch (error) {
    errorLog('Error in activity check scheduler:', error);
    throw error;
  }
};

/**
 * Starts a periodic activity checker that runs every 30 minutes
 * Returns a function that can be called to stop the checker
 */
const startActivityChecker = (activityQueue) => {
  if (!activityQueue) {
    errorLog('Cannot start activity checker: queue not provided');
    return () => {};
  }
  
  info('Starting periodic activity checker (30 minute interval)');
  
  // Run immediately on startup
  scheduleActivityChecks(activityQueue).catch(err => {
    errorLog('Error in initial activity check:', err);
  });
  
  // Then run every 30 minutes
  const intervalId = setInterval(() => {
    scheduleActivityChecks(activityQueue).catch(err => {
      errorLog('Error in scheduled activity check:', err);
    });
  }, 30 * 60 * 1000); // 30 minutes
  
  // Return function to stop the checker
  return () => {
    info('Stopping periodic activity checker');
    clearInterval(intervalId);
  };
};

module.exports = {
  scheduleActivityChecks,
  startActivityChecker
}; 