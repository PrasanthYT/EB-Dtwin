const { Queue } = require('bullmq');
const { redisClient } = require('@dtwin/config/config/cache');
const { info, errorLog, warn, debug } = require('@dtwin/config');

/**
 * Queue names for different notification types
 * Used consistently throughout the app
 */
const QUEUES = {
  MEDICATION_REMINDER: 'medication-reminder',
  MEAL_REMINDER: 'meal-reminder',
  ACTIVITY_CHECK: 'activity-check',
  WATCH_CHECK: 'watch-check'
};

/**
 * Default configuration for all queues
 * Centralized to ensure consistent behavior
 */
const queueOptions = {
  prefix: 'dtwin:notification',
  defaultJobOptions: {
    attempts: 3,           // Retry 3 times if job fails
    backoff: {
      type: 'exponential', // Backoff exponentially between retries
      delay: 5000          // Start with 5 seconds, then exponential increase
    },
    removeOnComplete: 100, // Keep last 100 completed jobs for debugging
    removeOnFail: 200,     // Keep more failed jobs for troubleshooting
    sizeLimit: 10000,      // Limit memory usage for large job data (bytes)
  }
};

/**
 * Enhanced queue creation function with consistent options
 * @param {string} queueName - Name of the queue to create
 * @param {Object} customOptions - Custom options to override defaults
 * @returns {Queue} BullMQ queue instance
 */
const createQueue = (queueName, customOptions = {}) => {
  if (!redisClient) {
    throw new Error(`Cannot create queue '${queueName}': Redis client not available`);
  }
  
  const redisOptions = {
    ...redisClient.options,
    maxRetriesPerRequest: null, // Prevent closing Redis connections on queue errors
    enableReadyCheck: false     // Improve performance by skipping ready checks
  };
  
  // Merge default options with any custom options
  const options = {
    connection: redisOptions,
    prefix: queueOptions.prefix,
    defaultJobOptions: {
      ...queueOptions.defaultJobOptions,
      ...customOptions.defaultJobOptions
    }
  };
  
  debug(`Creating queue: ${queueName} with prefix ${options.prefix}`);
  return new Queue(queueName, options);
};

/**
 * Initializes all notification queues
 * @returns {Promise<Object>} Map of initialized queues
 */
const initQueues = async () => {
  info('Initializing notification queues...');
  
  try {
    // Test Redis connectivity before creating queues
    if (!redisClient) {
      throw new Error('Redis client not available - cannot initialize queues');
    }
    
    try {
      await redisClient.ping();
      debug('Redis connectivity check passed');
    } catch (pingErr) {
      warn(`Redis ping failed, queue operations may be unreliable: ${pingErr.message}`);
    }
    
    // Generate a unique instance ID for this server if not already set
    if (!global.INSTANCE_ID) {
      global.INSTANCE_ID = require('crypto').randomBytes(6).toString('hex');
    }
    const instanceId = global.INSTANCE_ID;
    info(`Initializing queues with instance ID: ${instanceId}`);
    
    // Create all queues with consistent configuration
    const medicationQueue = createQueue(QUEUES.MEDICATION_REMINDER, {
      defaultJobOptions: {
        removeOnComplete: 50, // Less history needed for medication reminders
        // Function to create a unique job key for exact deduplication
        jobId: (payload) => {
          // Create content-based ID that doesn't change with each server restart
          const { userId, medicationName, dosage } = payload;
          const timeComponent = payload.scheduledTime ? 
            new Date(payload.scheduledTime).toISOString().slice(0, 16) : // Up to minutes precision
            new Date().toISOString().slice(0, 13); // Up to hours precision for immediate jobs
          
          return `med:${userId}:${medicationName}:${dosage}:${timeComponent}`;
        }
      }
    });
    
    const mealQueue = createQueue(QUEUES.MEAL_REMINDER, {
      defaultJobOptions: {
        removeOnComplete: 50, // Less history needed for meal reminders
        // Function to create a unique job key for exact deduplication
        jobId: (payload) => {
          const { userId, mealType } = payload;
          const timeComponent = payload.scheduledTime ? 
            new Date(payload.scheduledTime).toISOString().slice(0, 16) : 
            new Date().toISOString().slice(0, 13);
          
          return `meal:${userId}:${mealType}:${timeComponent}`;
        }
      }
    });
    
    const activityQueue = createQueue(QUEUES.ACTIVITY_CHECK, {
      defaultJobOptions: {
        // Activity reminders can be duplicated after a cooldown period
        jobId: (payload) => {
          const { userId, inactiveHours } = payload;
          // Use date with reduced precision to allow for small timestamp differences
          const now = new Date();
          const dateKey = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
          const hourKey = `hour-${now.getHours()}`;
          
          return `activity:${userId}:${inactiveHours || 'check'}:${dateKey}:${hourKey}`;
        }
      }
    });
    
    const watchQueue = createQueue(QUEUES.WATCH_CHECK, {
      defaultJobOptions: {
        jobId: (payload) => {
          const { userId } = payload;
          // Use date with reduced precision
          const now = new Date();
          const dateKey = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
          const hourKey = `hour-${now.getHours()}`;
          
          return `watch:${userId}:${dateKey}:${hourKey}`;
        }
      }
    });
    
    // Clean up orphaned jobs on startup
    await cleanupOrphanedJobs([
      medicationQueue,
      mealQueue,
      activityQueue,
      watchQueue
    ]);
    
    // Set up queue event handlers for monitoring
    for (const queue of [medicationQueue, mealQueue, activityQueue, watchQueue]) {
      // Log errors for debugging
      queue.on('error', (err) => {
        errorLog(`Error in queue ${queue.name}:`, err);
      });
      
      // Log successful completion for metrics
      queue.on('completed', (job) => {
        debug(`Job ${job.id} in queue ${queue.name} completed successfully`);
      });
      
      // Log failed jobs with error details
      queue.on('failed', (job, err) => {
        errorLog(`Job ${job.id} in queue ${queue.name} failed:`, err);
      });
      
      // Log stalled jobs that got stuck
      queue.on('stalled', (jobId) => {
        warn(`Job ${jobId} in queue ${queue.name} stalled and will be reprocessed`);
      });
      
      // Log when jobs are removed
      queue.on('removed', (jobId) => {
        debug(`Job ${jobId} removed from queue ${queue.name}`);
      });
    }
    
    info('✅ Notification queues initialized successfully');
    
    return {
      [QUEUES.MEDICATION_REMINDER]: medicationQueue,
      [QUEUES.MEAL_REMINDER]: mealQueue,
      [QUEUES.ACTIVITY_CHECK]: activityQueue,
      [QUEUES.WATCH_CHECK]: watchQueue
    };
  } catch (error) {
    errorLog('Failed to initialize queues:', error);
    throw error;
  }
};

/**
 * Clean up orphaned jobs that might be stuck in active/stalled state
 * @param {Array<Queue>} queues - Array of queue instances
 * @returns {Promise<void>}
 */
const cleanupOrphanedJobs = async (queues) => {
  if (!queues || !Array.isArray(queues) || queues.length === 0) return;
  
  info('Cleaning up orphaned jobs from previous runs...');
  
  // Record cleanup metrics
  let totalCleaned = 0;
  let failedCleanups = 0;
  
  // Process each queue
  for (const queue of queues) {
    try {
      // Check for jobs in active state that might be stuck
      const activeJobs = await queue.getJobs(['active']);
      const stalledJobs = await queue.getJobs(['stalled']);
      
      // Combine active and stalled jobs for processing
      const potentiallyStuckJobs = [...activeJobs, ...stalledJobs];
      
      if (potentiallyStuckJobs.length > 0) {
        info(`Found ${potentiallyStuckJobs.length} potentially stuck jobs in ${queue.name} queue`);
        
        // Process jobs in batches to avoid overwhelming the system
        const batchSize = 10;
        for (let i = 0; i < potentiallyStuckJobs.length; i += batchSize) {
          const batch = potentiallyStuckJobs.slice(i, i + batchSize);
          
          // Process each job in the batch
          for (const job of batch) {
            try {
              // Check if job is older than 5 minutes
              const processedOn = job.processedOn;
              if (processedOn && (Date.now() - processedOn) > 5 * 60 * 1000) {
                // Move old job to failed state
                await job.moveToFailed(
                  new Error(`Job cleanup: Orphaned in ${job.processingOn ? 'active' : 'stalled'} state`),
                  'cleanup-job'
                );
                totalCleaned++;
                debug(`Cleaned up orphaned job ${job.id} from ${queue.name} queue`);
              }
            } catch (jobErr) {
              warn(`Failed to clean up job ${job.id}: ${jobErr.message}`);
              failedCleanups++;
            }
          }
          
          // Small delay between batches to avoid overwhelming Redis
          if (i + batchSize < potentiallyStuckJobs.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
    } catch (queueErr) {
      warn(`Error cleaning up queue ${queue.name}: ${queueErr.message}`);
    }
  }
  
  // Log cleanup results
  if (totalCleaned > 0 || failedCleanups > 0) {
    info(`Queue cleanup complete: ${totalCleaned} jobs cleaned up, ${failedCleanups} failed cleanups`);
  } else {
    info('No orphaned jobs found that needed cleanup');
  }
};

/**
 * Pauses all notification queues
 * @param {Object} queues - Map of queue objects
 * @returns {Promise<void>}
 */
const pauseAllQueues = async (queues) => {
  if (!queues) return;
  
  try {
    for (const [name, queue] of Object.entries(queues)) {
      if (queue && typeof queue.pause === 'function') {
        await queue.pause();
        info(`Queue ${name} paused`);
      }
    }
    info('All notification queues paused');
  } catch (err) {
    errorLog('Error pausing queues:', err);
  }
};

/**
 * Resumes all notification queues
 * @param {Object} queues - Map of queue objects
 * @returns {Promise<void>}
 */
const resumeAllQueues = async (queues) => {
  if (!queues) return;
  
  try {
    for (const [name, queue] of Object.entries(queues)) {
      if (queue && typeof queue.resume === 'function') {
        await queue.resume();
        info(`Queue ${name} resumed`);
      }
    }
    info('All notification queues resumed');
  } catch (err) {
    errorLog('Error resuming queues:', err);
  }
};

module.exports = {
  QUEUES,
  queueOptions,
  initQueues,
  pauseAllQueues,
  resumeAllQueues,
  createQueue // Export for testing
}; 