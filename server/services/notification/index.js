const express = require('express');
const cron = require('node-cron');
const { scheduleAllUsersJobs } = require('./jobs/schedulerJob');
const { initQueues, QUEUES, pauseAllQueues, resumeAllQueues } = require('./queues');
const { initWorkers } = require('./workers/reminderWorker');
const { initSocketService } = require('./services/socketService');
const { checkRedisHealth } = require('./utils/redisConfig');
const { info, errorLog, warn, debug } = require('@dtwin/config');
const { redisClient } = require('@dtwin/config/config/cache');
const { startQueueMonitoring, getAllQueueMetrics } = require('./utils/queueMonitoring');
const notificationUpdateUtils = require('./utils/notificationUpdateUtils');

/**
 * Notification service initialization and management module
 * Handles service startup, shutdown, and Redis integration
 */

// Add tracking for scheduler initialization
let schedulerInitializationCount = 0;

// Track service initialization to prevent duplicates
let isServiceInitialized = false;

// Track cleanup functions
let stopSocketService = null;
let stopQueueMonitoring = null;

/**
 * Checks if the scheduler can run by checking a Redis lock
 * This prevents multiple concurrent schedulers from running
 * @returns {Promise<boolean>} Whether the scheduler can run or not
 */
const canRunScheduler = async () => {
  if (!redisClient) return true; // If Redis is unavailable, just allow running
  
  const SCHEDULER_LOCK_KEY = 'scheduler:running_lock';
  const SCHEDULER_COOLDOWN_KEY = 'scheduler:last_run';
  const LOCK_EXPIRY_SECONDS = 60; // 1 minute lock to prevent concurrent runs
  const COOLDOWN_SECONDS = 10;    // 10 second cooldown between runs
  
  try {
    // First check if there was a recent run
    const lastRun = await redisClient.get(SCHEDULER_COOLDOWN_KEY);
    if (lastRun) {
      const elapsedSeconds = (Date.now() - parseInt(lastRun)) / 1000;
      if (elapsedSeconds < COOLDOWN_SECONDS) {
        info(`Scheduler recently ran ${elapsedSeconds.toFixed(1)}s ago (cooldown: ${COOLDOWN_SECONDS}s)`);
        return false;
      }
    }
    
    // Try to acquire a lock with NX option (only set if key doesn't exist)
    const lockAcquired = await redisClient.set(
      SCHEDULER_LOCK_KEY, 
      Date.now().toString(), 
      'EX', LOCK_EXPIRY_SECONDS,
      'NX' // Only set if not exists
    );
    
    if (!lockAcquired) {
      info('Scheduler already running (lock exists in Redis)');
      return false;
    }
    
    // Set last run time (this happens right before we actually run the scheduler)
    await redisClient.set(SCHEDULER_COOLDOWN_KEY, Date.now().toString(), 'EX', 300); // 5 minute expiry for debugging
    
    // We acquired the lock, so we can run the scheduler
    return true;
  } catch (err) {
    warn(`Redis error in scheduler lock: ${err.message}`);
    // If Redis has an error, allow running the scheduler anyway
    return true;
  }
};

/**
 * Clears all queue data from Redis
 * This is used to ensure a fresh start without any stale jobs
 * @returns {Promise<boolean>} Whether the operation was successful
 */
const clearAllQueueData = async () => {
  if (!redisClient) {
    errorLog('Cannot clear queues: Redis client is not available');
    return false;
  }
  
  try {
    info('Clearing all queue data from Redis...');
    
    // More comprehensive approach to clear BullMQ/Redis queue data with dtwin-specific patterns
    const keyPatterns = [
      // BullMQ standard patterns
      'bull:*:id',                    // Queue ID counter
      'bull:*:jobs:*',                // Actual jobs
      'bull:*:stalled',               // Stalled jobs
      'bull:*:active',                // Active jobs
      'bull:*:waiting',               // Waiting jobs
      'bull:*:completed',             // Completed jobs
      'bull:*:failed',                // Failed jobs
      'bull:*:delayed',               // Delayed jobs
      'bull:*:paused',                // Paused state marker
      'bull:*:meta',                  // Queue metadata
      'bull:*:priority',              // Priority data
      'bull:*:wait',                  // Wait lists
      
      // Our specific queue prefix patterns
      'dtwin:notification:*',         // All our notification service queues
      'dtwin:notification:*:jobs:*',  // All job data for our notification queues
      
      // Specific queue names
      'dtwin:notification:medication-reminder:*',
      'dtwin:notification:meal-reminder:*',
      'dtwin:notification:activity-check:*',
      'dtwin:notification:watch-check:*',
      
      // Redis deduplication keys
      'notification_sent:*',           // Notification tracking keys
      'fcm:notif:*',                   // FCM notification tracking keys
      'fcm:ratelimit:*',               // FCM rate limiting keys
      'notification:dedup:*',          // New notification deduplication keys
      'activity_notification:*',       // Activity notification cooldown keys
      'watch_notification:*',          // Watch notification cooldown keys
    ];
    
    let totalKeys = 0;
    let deletedKeys = 0;
    
    // Process each key pattern separately to avoid hitting Redis command limits
    for (const pattern of keyPatterns) {
      try {
        const keys = await redisClient.keys(pattern);
        totalKeys += keys.length;
        
        if (keys.length > 0) {
          info(`Found ${keys.length} keys matching pattern '${pattern}'`);
          
          // Delete in batches to avoid command length issues
          const batchSize = 100;
          for (let i = 0; i < keys.length; i += batchSize) {
            const batch = keys.slice(i, i + batchSize);
            if (batch.length > 0) {
              try {
                const result = await redisClient.del(...batch);
                deletedKeys += result;
                debug(`Deleted ${result}/${batch.length} keys from batch ${i/batchSize + 1}`);
              } catch (batchErr) {
                warn(`Error deleting batch of keys: ${batchErr.message}`);
              }
            }
          }
        }
      } catch (patternErr) {
        warn(`Error searching keys with pattern '${pattern}': ${patternErr.message}`);
      }
    }
    
    // Second approach: If we have access to BullMQ Queue objects, use their obliterate method
    try {
      debug('Attempting to use BullMQ obliterate method if queues are initialized...');
      if (global.notificationQueues) {
        for (const [name, queue] of Object.entries(global.notificationQueues)) {
          if (queue && typeof queue.obliterate === 'function') {
            info(`Obliterating queue ${name}...`);
            await queue.obliterate({ force: true });
            info(`Queue ${name} obliterated successfully`);
          }
        }
      }
    } catch (obliterateErr) {
      warn(`Error obliterating queues: ${obliterateErr.message}`);
    }
    
    if (totalKeys === 0) {
      info('No queue data found in Redis that needed clearing');
    } else {
      info(`✅ Successfully processed ${totalKeys} queue-related keys from Redis (deleted ${deletedKeys})`);
    }
    
    return true;
  } catch (err) {
    errorLog('Error clearing queue data from Redis:', err);
    return false;
  }
};

/**
 * Initializes the notification service
 * Sets up Redis, queues, workers, and schedulers
 * @param {Object} app - Express application instance
 * @param {Object} io - Socket.IO server instance
 * @returns {Object} Service instance with cleanup function
 */
const initNotificationService = async (app, io) => {
  // Prevent multiple initializations
  if (isServiceInitialized) {
    warn('Notification service is already initialized. Skipping duplicate initialization.');
    return global.notificationServiceInstance;
  }
  
  info('Initializing notification service with Redis integration...');
  
  // Validate Redis availability - Redis is critical for queue processing
  if (!redisClient) {
    const redisError = {
      status: 500,
      code: 'REDIS_UNAVAILABLE',
      message: 'Redis client is not available - cannot proceed without Redis',
      details: {
        component: 'notification-service',
        severity: 'critical',
        impact: 'Service cannot start without Redis connection'
      }
    };
    errorLog(redisError.message, redisError.details);
    throw redisError;
  }
  
  // Check Redis health to ensure proper connectivity
  const redisHealth = await checkRedisHealth(redisClient);
  if (!redisHealth.connected) {
    warn(`Redis health check failed: ${redisHealth.message}`);
    warn('Notification service may experience issues without healthy Redis connection');
  } else {
    info('✅ Redis health check passed:', redisHealth.message);
  }
  
  // Clear all existing queues in Redis for a fresh start
  try {
    await clearAllQueueData();
    info('✅ Queue data cleared for a fresh start');
  } catch (err) {
    warn('Failed to clear existing queue data:', err.message);
    warn('Continuing with potential stale queue data');
  }
  
  try {
    debug('Using already connected Redis client');
  } catch (err) {
    const redisConfigError = {
      status: 500,
      code: 'REDIS_CONFIG_ERROR',
      message: 'Redis configuration check failed - continuing with default settings',
      details: {
        error: err.message,
        stack: err.stack,
        component: 'redis-config',
        severity: 'warning'
      }
    };
    warn(redisConfigError.message, redisConfigError.details);
  }
  
  // Initialize queues for processing different types of notifications
  // Queues provide reliability and persistence for notification jobs
  let queues;
  try {
    queues = await initQueues();
    
    // Store reference to queues in global space so we can use it for cleanup operations
    global.notificationQueues = queues;
    
  } catch (err) {
    const queueInitError = {
      status: 500,
      code: 'QUEUE_INIT_FAILED',
      message: 'Failed to initialize notification queues',
      details: {
        error: err.message,
        stack: err.stack,
        component: 'notification-queues',
        severity: 'critical'
      }
    };
    errorLog('Queue initialization error:', err);
    throw queueInitError;
  }
  
  // Initialize Socket.IO service for real-time WebSocket notifications
  try {
    stopSocketService = initSocketService(io);
    info('✅ Socket service initialized successfully');
  } catch (err) {
    const socketError = {
      status: 500,
      code: 'SOCKET_INIT_FAILED',
      message: 'Failed to initialize socket service',
      details: {
        error: err.message,
        stack: err.stack,
        component: 'socket-service',
        severity: 'high'
      }
    };
    errorLog('Socket service initialization error:', err);
    throw socketError;
  }
  
  // Initialize workers that process jobs from the notification queues
  // Workers handle actual sending of notifications via WebSocket and FCM
  let workers;
  try {
    workers = initWorkers(queues, io);
    info('✅ Notification workers initialized successfully');
  } catch (err) {
    const workerError = {
      status: 500,
      code: 'WORKER_INIT_FAILED',
      message: 'Failed to initialize notification workers',
      details: {
        error: err.message,
        stack: err.stack,
        component: 'notification-workers',
        severity: 'high'
      }
    };
    errorLog('Worker initialization error:', err);
    throw workerError;
  }
  
  // Start monitoring the queues for operational insights and debugging
  try {
    stopQueueMonitoring = startQueueMonitoring(queues, 300000, { 
      ignoreCompleted: true // Ignore completed jobs in metrics to avoid confusion
    });
    info('✅ Queue monitoring started');
  } catch (err) {
    const monitoringError = {
      status: 500,
      code: 'MONITORING_INIT_FAILED',
      message: 'Failed to start queue monitoring',
      details: {
        error: err.message,
        component: 'queue-monitoring',
        severity: 'medium'
      }
    };
    warn('Queue monitoring initialization error:', err);
    // Non-critical, continue execution
  }
  
  // Initialize midnight scheduler for daily notification jobs
  // This handles scheduled notifications that should run at midnight
  const midnightScheduler = cron.schedule('0 0 * * *', () => {
    info('Running midnight job scheduler');
    schedulerInitializationCount++;
    debug(`Scheduler call #${schedulerInitializationCount} from midnight cron job`);
    
    // Use the canRunScheduler function to prevent duplicate runs
    canRunScheduler().then(canRun => {
      if (canRun) {
        scheduleAllUsersJobs(queues).catch(err => {
          const schedulerError = {
            status: 500,
            code: 'SCHEDULER_JOB_FAILED',
            message: 'Error in midnight scheduler',
            details: {
              error: err.message,
              stack: err.stack,
              component: 'cron-scheduler',
              severity: 'medium',
              jobType: 'midnight-scheduler'
            }
          };
          errorLog(schedulerError.message, schedulerError.details);
        });
      } else {
        info('Skipping duplicate midnight scheduler - already running or recently completed');
      }
    }).catch(err => {
      warn(`Error checking scheduler lock: ${err.message}`);
      // If there's an error checking the lock, run anyway
      scheduleAllUsersJobs(queues).catch(scheduleErr => {
        errorLog('Error in midnight scheduler:', scheduleErr);
      });
    });
  });
  
  midnightScheduler.start();
  info('✅ Midnight scheduler initialized');
  
  // Schedule initial jobs for all users when service starts
  try {
    schedulerInitializationCount++;
    debug(`Scheduler call #${schedulerInitializationCount} from service initialization`);
    
    // Check if scheduler can run to prevent duplicate processing
    const schedulerCanRun = await canRunScheduler();
    
    if (schedulerCanRun) {
      await scheduleAllUsersJobs(queues);
      info('✅ Initial job scheduling completed');
    } else {
      info('Skipping duplicate scheduleAllUsersJobs - already running or recently completed');
    }
  } catch (err) {
    const initialScheduleError = {
      status: 500,
      code: 'INITIAL_SCHEDULING_FAILED',
      message: 'Error in initial job scheduling',
      details: {
        error: err.message,
        stack: err.stack,
        component: 'job-scheduler',
        severity: 'high'
      }
    };
    errorLog(initialScheduleError.message, initialScheduleError.details);
  }
  
  // Set up API routes for notification service health checks and management
  if (app) {
    const router = express.Router();
    
    // Health check endpoint for monitoring the notification service status
    router.get('/health', async (req, res) => {
      try {
        const redisHealth = await checkRedisHealth(redisClient);
        
        // Get status of all workers for the health response
        const workerStatus = Object.keys(workers).reduce((status, key) => {
          const worker = workers[key];
          status[key] = {
            running: !!worker,
            paused: worker?.isPaused?.() || false
          };
          return status;
        }, {});
        
        // Get queue metrics for health check
        const queueMetrics = await getAllQueueMetrics(queues, { 
          ignoreCompleted: true,
          minimal: true
        }).catch(err => ({ error: err.message }));
        
        res.status(200).json({ 
          status: redisHealth.connected ? 'healthy' : 'degraded',
          timestamp: new Date().toISOString(),
          components: {
            redis: redisHealth,
            workers: workerStatus,
            queues: queueMetrics.error ? 
              { error: queueMetrics.error } : 
              queueMetrics.queues
          }
        });
      } catch (err) {
        const healthCheckError = {
          status: 'error',
          code: 'HEALTH_CHECK_FAILED',
          message: 'Failed to check notification service health',
          timestamp: new Date().toISOString(),
          error: err.message,
          details: {
            stack: err.stack,
            component: 'service-health-check',
            severity: 'medium'
          }
        };
        errorLog('Health check error:', healthCheckError);
        res.status(500).json(healthCheckError);
      }
    });
    
    // Queue metrics endpoint for the queue monitoring UI
    router.get('/queue-metrics', async (req, res) => {
      try {
        const ignoreCompleted = req.query.ignoreCompleted !== 'false'; // Default to true
        const metrics = await getAllQueueMetrics(queues, { ignoreCompleted });
        
        if (metrics.error) {
          return res.status(500).json({
            status: 'error',
            code: 'QUEUE_METRICS_FAILED',
            message: metrics.message || 'Failed to get queue metrics',
            timestamp: new Date().toISOString()
          });
        }
        
        res.status(200).json(metrics);
      } catch (err) {
        const metricsError = {
          status: 'error',
          code: 'QUEUE_METRICS_ERROR',
          message: 'Error retrieving queue metrics',
          timestamp: new Date().toISOString(),
          error: err.message,
          details: {
            stack: err.stack,
            component: 'queue-metrics',
            severity: 'medium'
          }
        };
        errorLog('Queue metrics error:', metricsError);
        res.status(500).json(metricsError);
      }
    });
    
    // Queue management endpoints
    router.post('/queues/pause', async (req, res) => {
      try {
        await pauseAllQueues(queues);
        res.status(200).json({
          status: 'success',
          message: 'All notification queues paused',
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        errorLog('Error pausing queues:', err);
        res.status(500).json({
          status: 'error',
          message: 'Failed to pause notification queues',
          error: err.message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    router.post('/queues/resume', async (req, res) => {
      try {
        await resumeAllQueues(queues);
        res.status(200).json({
          status: 'success',
          message: 'All notification queues resumed',
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        errorLog('Error resuming queues:', err);
        res.status(500).json({
          status: 'error',
          message: 'Failed to resume notification queues',
          error: err.message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Mount the API routes
    app.use('/api/notifications', router);
    info('✅ Notification API routes mounted');
  }
  
  info('✅ Notification service successfully initialized');
  
  // Mark service as initialized
  isServiceInitialized = true;
  
  // Create service instance
  const serviceInstance = { 
    queues,
    workers,
    cleanup: async () => {
      info('💤 Notification service shutting down...');
      
      // Pause queues to prevent new jobs during shutdown
      try {
        await pauseAllQueues(queues);
        info('All queues paused for shutdown');
      } catch (err) {
        warn('Error pausing queues during shutdown:', err.message);
      }
      
      // Stop the workers
      try {
        for (const worker of Object.values(workers)) {
          if (worker && typeof worker.close === 'function') {
            await worker.close();
          }
        }
        info('All workers stopped');
      } catch (err) {
        warn('Error stopping workers:', err.message);
      }
      
      // Close Redis connections
      try {
        if (redisClient && redisClient.status === 'ready') {
          await redisClient.quit();
          info('Redis connection closed');
        }
      } catch (err) {
        warn('Error closing Redis connection:', err.message);
      }
      
      // Stop socket service
      try {
        if (stopSocketService) {
          stopSocketService();
          info('Socket service stopped');
        }
      } catch (err) {
        warn('Error stopping socket service:', err.message);
      }
      
      // Stop monitoring if active
      try {
        if (stopQueueMonitoring) {
          stopQueueMonitoring();
          info('Queue monitoring stopped');
        }
      } catch (err) {
        warn('Error stopping queue monitoring:', err.message);
      }
      
      // Stop the cron scheduler
      try {
        if (midnightScheduler) {
          midnightScheduler.stop();
          info('Cron scheduler stopped');
        }
      } catch (err) {
        warn('Error stopping cron scheduler:', err.message);
      }
      
      // Reset initialization state
      isServiceInitialized = false;
      
      info('👋 Notification service shutdown complete');
    }
  };
  
  // Store instance globally
  global.notificationServiceInstance = serviceInstance;
  
  // Return service components and cleanup function for proper shutdown
  return serviceInstance;
};


// Update the exports to include notification update utilities
module.exports = {
  initNotificationService,
  // Export for testing
  canRunScheduler,
  clearAllQueueData,
  
  // Add new notification update utilities
  updateMedicationNotifications: notificationUpdateUtils.updateMedicationNotifications,
  updateMealNotifications: notificationUpdateUtils.updateMealNotifications,
  cancelMedicationReminders: notificationUpdateUtils.cancelMedicationReminders,
  cancelMealReminders: notificationUpdateUtils.cancelMealReminders
}; 