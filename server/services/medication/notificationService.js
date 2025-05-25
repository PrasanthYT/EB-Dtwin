// Notification service bridge for medication service
const { QUEUES } = require('../../services/notification/queues');
const { initNotificationService } = require('../../services/notification/index');
const { info, errorLog, debug, warn } = require("@dtwin/config");
const { scheduleMedicationReminder } = require('../../services/notification/jobs/medReminder');

// Store reference to initialized queues
let notificationQueues = null;

/**
 * Initialize notification queues if they haven't been initialized yet
 * @returns {Object} Queue references
 * @throws {Error} If initialization fails
 */
const getQueues = async () => {
  if (!notificationQueues) {
    try {
      debug('Initializing notification queues for medication service');
      const notificationService = await initNotificationService();
      
      if (!notificationService || !notificationService.queues) {
        const error = new Error('Notification service initialization failed: no queues returned');
        error.code = 'NOTIFICATION_INIT_FAILED';
        throw error;
      }
      
      if (!notificationService.queues[QUEUES.MEDICATION_REMINDER]) {
        const error = new Error(`Medication reminder queue not found after initialization`);
        error.code = 'MEDICATION_QUEUE_NOT_FOUND';
        error.availableQueues = Object.keys(notificationService.queues);
        throw error;
      }
      
      notificationQueues = notificationService.queues;
      info('✅ Notification queues initialized for medication service');
    } catch (error) {
      const enhancedError = new Error(`Failed to initialize notification queues: ${error.message}`);
      enhancedError.originalError = error;
      enhancedError.code = error.code || 'QUEUE_INIT_FAILED';
      
      errorLog(`Notification queue initialization failed: ${enhancedError.message}`, {
        code: enhancedError.code,
        originalError: error.message,
        stack: error.stack
      });
      
      throw enhancedError;
    }
  }
  return notificationQueues;
};

/**
 * Schedule medication reminders for a user's medication
 * @param {string} userId - The user ID
 * @param {string} medicationId - The medication ID
 * @param {string} medicationName - The name of the medication
 * @param {Array<string>} timings - Array of time strings in HH:MM format
 * @returns {Object} Result with success status and details
 */
const schedMedicationReminders = async (userId, medicationId, medicationName, timings) => {
  try {
    // Input validation
    if (!userId) {
      const error = new Error('User ID is required for scheduling medication reminders');
      error.code = 'USER_ID_REQUIRED';
      throw error;
    }
    
    if (!medicationId) {
      const error = new Error('Medication ID is required for scheduling reminders');
      error.code = 'MEDICATION_ID_REQUIRED';
      throw error;
    }
    
    if (!medicationName) {
      warn(`Missing medication name for medication ${medicationId}, using 'Unknown Medication' instead`);
      medicationName = 'Unknown Medication';
    }
    
    if (!timings || !Array.isArray(timings) || timings.length === 0) {
      const error = new Error('Medication timings are required and must be a non-empty array');
      error.code = 'INVALID_TIMINGS';
      error.context = { userId, medicationId, timingsProvided: timings };
      throw error;
    }

    const queues = await getQueues();
    if (!queues || !queues[QUEUES.MEDICATION_REMINDER]) {
      const error = new Error('Medication reminder queue is not available');
      error.code = 'QUEUE_UNAVAILABLE';
      error.availableQueues = queues ? Object.keys(queues) : [];
      throw error;
    }

    info(`Scheduling ${timings.length} reminders for ${medicationName} (${medicationId}) for user ${userId}`);
    
    const results = [];
    const failedTimings = [];
    // Schedule a reminder for each timing
    for (const time of timings) {
      try {
        const job = await scheduleMedicationReminder(
          queues[QUEUES.MEDICATION_REMINDER],
          userId,
          medicationName,
          medicationId, // Using medicationId as the dosage for now
          time
        );
        
        if (job) {
          results.push({
            jobId: job.id,
            time,
            success: true
          });
        } else {
          failedTimings.push({
            time,
            reason: 'Time already passed for today'
          });
        }
      } catch (reminderError) {
        errorLog(`Failed to schedule reminder for ${medicationName} at ${time}:`, {
          error: reminderError.message,
          userId,
          medicationId
        });
        
        failedTimings.push({
          time,
          reason: reminderError.message || 'Unknown error'
        });
      }
    }
    
    if (results.length > 0) {
      info(`Successfully scheduled ${results.length} reminders for ${medicationName}`);
    }
    
    return {
      success: results.length > 0,
      scheduledCount: results.length,
      totalTimings: timings.length,
      jobDetails: results,
      failedTimings: failedTimings
    };
  } catch (error) {
    // Enhance the error with context
    const enhancedError = new Error(`Error scheduling medication reminders: ${error.message}`);
    enhancedError.originalError = error;
    enhancedError.code = error.code || 'SCHEDULE_REMINDERS_FAILED';
    enhancedError.context = {
      userId,
      medicationId,
      medicationName,
      timingsCount: timings?.length || 0
    };
    
    errorLog(`Failed to schedule medication reminders: ${enhancedError.message}`, {
      code: enhancedError.code,
      context: enhancedError.context,
      stack: error.stack
    });
    
    return {
      success: false,
      error: {
        code: enhancedError.code,
        message: enhancedError.message,
        context: enhancedError.context
      }
    };
  }
};

module.exports = {
  schedMedicationReminders
}; 