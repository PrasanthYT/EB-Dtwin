const { info, warn, debug, errorLog } = require('@dtwin/config');
const { QUEUES } = require('../queues');
const { redisClient } = require('@dtwin/config/config/cache');

/**
 * Cancels existing medication reminder jobs for a user's medication
 * @param {Object} queue - The medication reminder queue
 * @param {string} userId - The user ID
 * @param {string} medicationName - The medication name
 * @returns {Promise<number>} The number of canceled jobs
 */
const cancelMedicationReminders = async (queue, userId, medicationName) => {
  if (!queue) {
    warn(`Cannot cancel medication reminders: Queue not available`);
    return 0;
  }

  try {
    // Get all waiting and delayed jobs in the queue
    const existingJobs = await queue.getJobs(['waiting', 'delayed']);
    info(`Found ${existingJobs.length} existing medication reminder jobs to check for cancellation`);
    
    let cancelCount = 0;
    
    // Filter and remove jobs for this specific user and medication
    for (const job of existingJobs) {
      try {
        if (job?.data?.userId === userId && 
            job?.data?.medicationName === medicationName) {
          debug(`Canceling medication reminder job ${job.id} for ${medicationName}`);
          await job.remove();
          cancelCount++;
          
          // Also clear any Redis deduplication keys
          if (job?.data?.scheduledTime) {
            const deduplicationKey = `notification:schedule:med:${userId}:${medicationName}:${job.data.scheduledTime}`;
            await redisClient.del(deduplicationKey);
            debug(`Cleared deduplication key: ${deduplicationKey}`);
          }
        }
      } catch (jobErr) {
        warn(`Error canceling job ${job?.id}: ${jobErr.message}`);
      }
    }
    
    if (cancelCount > 0) {
      info(`Canceled ${cancelCount} medication reminders for user ${userId} medication ${medicationName}`);
    } else {
      debug(`No medication reminders found to cancel for user ${userId} medication ${medicationName}`);
    }
    
    return cancelCount;
  } catch (error) {
    errorLog(`Error canceling medication reminders: ${error.message}`, error);
    return 0;
  }
};

/**
 * Cancels existing meal reminder jobs for a user
 * @param {Object} queue - The meal reminder queue
 * @param {string} userId - The user ID
 * @param {string} mealType - Optional specific meal type to cancel
 * @returns {Promise<number>} The number of canceled jobs
 */
const cancelMealReminders = async (queue, userId, mealType = null) => {
  if (!queue) {
    warn(`Cannot cancel meal reminders: Queue not available`);
    return 0;
  }

  try {
    // Get all waiting and delayed jobs in the queue
    const existingJobs = await queue.getJobs(['waiting', 'delayed']);
    info(`Found ${existingJobs.length} existing meal reminder jobs to check for cancellation`);
    
    let cancelCount = 0;
    
    // Filter and remove jobs for this specific user and meal type
    for (const job of existingJobs) {
      try {
        if (job?.data?.userId === userId && 
            (mealType === null || job?.data?.mealType === mealType)) {
          debug(`Canceling meal reminder job ${job.id} for ${job?.data?.mealType || 'unknown meal'}`);
          await job.remove();
          cancelCount++;
          
          // Also clear any Redis deduplication keys
          if (job?.data?.mealType && job?.data?.scheduledTime) {
            const deduplicationKey = `notification:schedule:meal:${userId}:${job.data.mealType}:${job.data.scheduledTime}`;
            await redisClient.del(deduplicationKey);
            debug(`Cleared deduplication key: ${deduplicationKey}`);
          }
        }
      } catch (jobErr) {
        warn(`Error canceling job ${job?.id}: ${jobErr.message}`);
      }
    }
    
    if (cancelCount > 0) {
      info(`Canceled ${cancelCount} meal reminders for user ${userId}${mealType ? ` meal type ${mealType}` : ''}`);
    } else {
      debug(`No meal reminders found to cancel for user ${userId}${mealType ? ` meal type ${mealType}` : ''}`);
    }
    
    return cancelCount;
  } catch (error) {
    errorLog(`Error canceling meal reminders: ${error.message}`, error);
    return 0;
  }
};

/**
 * Updates medication notifications by canceling old ones and scheduling new ones
 * @param {Object} queues - The notification queues
 * @param {string} userId - The user ID
 * @param {string} medicationName - The medication name
 * @param {string} medicationId - The medication ID (UUID)
 * @param {Array<string>} newTimings - Array of new timings for the medication
 * @param {string} dose - The medication dose information (optional)
 * @returns {Promise<Object>} Result with cancellation and scheduling details
 */
const updateMedicationNotifications = async (queues, userId, medicationName, medicationId, newTimings, dose = "") => {
  if (!queues || !queues[QUEUES.MEDICATION_REMINDER]) {
    const error = new Error('Medication reminder queue is not available');
    error.code = 'QUEUE_UNAVAILABLE';
    throw error;
  }

  try {
    // First, cancel all existing notifications for this medication
    const canceledCount = await cancelMedicationReminders(
      queues[QUEUES.MEDICATION_REMINDER], 
      userId, 
      medicationName
    );
    
    // Now schedule new notifications with updated timings
    const results = {
      canceled: canceledCount,
      scheduled: 0,
      failedTimings: []
    };

    // Schedule new reminders for each timing
    for (const time of newTimings) {
      try {
        const { calculateTimeToNextMedication } = require('./timeUtils');
        const delayMs = calculateTimeToNextMedication(time);
        
        if (delayMs > 0) {
          await queues[QUEUES.MEDICATION_REMINDER].add(
            'medication',
            {
              userId,
              medicationName,
              medicationId, // The UUID of the medication
              dose: dose || "", // Medication dose as a string
              scheduledTime: time,
              deliveryPreference: 'websocket-first'
            },
            {
              delay: delayMs,
              removeOnComplete: true,
              jobId: `med:${userId}:${medicationName}:${time}:${Date.now()}`
            }
          );
          results.scheduled++;
          info(`Scheduled medication reminder for user ${userId} at ${time} (in ${delayMs / 1000 / 60} minutes)`);
        } else {
          results.failedTimings.push({
            time,
            reason: 'Time already passed for today'
          });
        }
      } catch (err) {
        errorLog(`Failed to schedule reminder for ${medicationName} at ${time}:`, {
          error: err.message,
          userId,
          medicationId
        });
        
        results.failedTimings.push({
          time,
          reason: err.message || 'Unknown error'
        });
      }
    }
    
    info(`Notification update for ${medicationName}: Canceled ${results.canceled}, scheduled ${results.scheduled} new reminders`);
    return results;
  } catch (error) {
    errorLog(`Error updating medication notifications: ${error.message}`, error);
    throw error;
  }
};

/**
 * Updates meal notifications by canceling old ones and scheduling new ones
 * @param {Object} queues - The notification queues
 * @param {string} userId - The user ID
 * @param {Object} mealTimings - Object with meal types and times
 * @returns {Promise<Object>} Result with cancellation and scheduling details
 */
const updateMealNotifications = async (queues, userId, mealTimings) => {
  if (!queues || !queues[QUEUES.MEAL_REMINDER]) {
    const error = new Error('Meal reminder queue is not available');
    error.code = 'QUEUE_UNAVAILABLE';
    throw error;
  }

  try {
    // First, cancel all existing notifications for all meal types
    const canceledCount = await cancelMealReminders(
      queues[QUEUES.MEAL_REMINDER], 
      userId
    );
    
    // Now schedule new notifications with updated timings
    const results = {
      canceled: canceledCount,
      scheduled: 0,
      mealTypes: Object.keys(mealTimings).length
    };

    // Schedule new reminders for each meal type
    for (const [mealType, time] of Object.entries(mealTimings)) {
      try {
        const { calculateTimeToNextMeal } = require('./timeUtils');
        const delayMs = calculateTimeToNextMeal(time);
        
        if (delayMs > 0) {
          await queues[QUEUES.MEAL_REMINDER].add(
            'meal',
            {
              userId,
              mealType,
              scheduledTime: time,
              deliveryPreference: 'websocket-first'
            },
            {
              delay: delayMs,
              removeOnComplete: true,
              jobId: `meal:${userId}:${mealType}:${Date.now()}`
            }
          );
          results.scheduled++;
          info(`Scheduled ${mealType} reminder for user ${userId} at ${time} (in ${delayMs / 1000 / 60} minutes)`);
        }
      } catch (err) {
        warn(`Failed to schedule ${mealType} reminder for user ${userId} at ${time}: ${err.message}`);
      }
    }
    
    info(`Meal notification update: Canceled ${results.canceled}, scheduled ${results.scheduled} new reminders`);
    return results;
  } catch (error) {
    errorLog(`Error updating meal notifications: ${error.message}`, error);
    throw error;
  }
};

module.exports = {
  cancelMedicationReminders,
  cancelMealReminders,
  updateMedicationNotifications,
  updateMealNotifications
}; 