const { Worker } = require('bullmq');
const { QUEUES, queueOptions } = require('../queues');
const { redisClient } = require('@dtwin/config/config/cache');
const { logger, info, errorLog, warn, debug } = require('@dtwin/config/config/logging');
const { sendSocketNotification, isUserConnected } = require('../services/socketService');
const { sendPushNotification, initFirebase } = require('../services/pushService');

// Add this global variable to track FCM initialization
let firebaseInitialized = false;

/**
 * Enhanced notification deduplication system using Redis for distributed locking
 * This prevents race conditions and duplicate notifications across service instances
 */

/**
 * Create a standardized deduplication key with user, type, details and timeframe
 * @param {string} userId - User identifier
 * @param {string} type - Notification type 
 * @param {string} details - Details to distinguish this notification
 * @param {Date|number|string} [specificTime] - Optional specific timeframe
 * @returns {string} Deduplication key
 */
const createDeduplicationKey = (userId, type, details, specificTime = null) => {
  // Use minute-level granularity for deduplication
  const now = specificTime ? new Date(specificTime) : new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  // Create a key that will be unique for this user+type+details within the current minute
  return `notification:dedup:${userId}:${type}:${details}:ymd-${year}${month}${day}-h${hour}-m${minute}`;
};

/**
 * Acquires a notification lock to prevent duplicates
 * @param {string} deduplicationKey - The deduplication key
 * @param {number} lockTTL - Time to live for the lock in seconds
 * @returns {Promise<boolean>} - True if lock was acquired
 */
async function acquireNotificationLock(deduplicationKey, lockTTL = 120) {
  // Use Redis SETNX for atomic deduplication
  try {
    // Create a distributed lock in Redis that expires after lockTTL seconds
    const result = await redisClient.set(deduplicationKey, '1', 'EX', lockTTL, 'NX');
    debug(`[Deduplication] SETNX for key: ${deduplicationKey}, result: ${result}`);
    
    // If result is 'OK', we acquired the lock, otherwise someone else has it
    return result === 'OK';
  } catch (error) {
    errorLog(`Error acquiring notification lock: ${error.message}`);
    // In case of Redis errors, default to allowing the notification to avoid missing important alerts
    return true;
  }
}

/**
 * Helper function to release a lock early if needed (rarely used)
 * @param {string} key - Deduplication key to release
 * @returns {Promise<boolean>} True if released successfully
 */
const releaseNotificationLock = async (key) => {
  if (!redisClient) return false;
  
  try {
    await redisClient.del(key);
    return true;
  } catch (err) {
    warn(`Redis error releasing notification lock: ${err.message}`);
    return false;
  }
};

/**
 * Creates a worker with enhanced error handling and logging
 * @param {string} queueName - Name of the queue to process
 * @param {Function} processor - Job processing function 
 * @returns {Worker} BullMQ worker instance
 */
const createWorker = (queueName, processor) => {
  try {
    // Create a new BullMQ worker with Redis connection and processing options
    const worker = new Worker(queueName, processor, {
      connection: {
        ...redisClient.options,
        maxRetriesPerRequest: null
      },
      autorun: true,           
      concurrency: 1,          // Single concurrency to prevent race conditions
      lockDuration: 30000,     // 30-second lock to prevent multiple workers grabbing same job
      skipLockRenewal: false,  // Keep job locks active during processing
      drainDelay: 5,           // Small delay between polling to reduce CPU
      lockRenewTime: 15000,    // Renew locks halfway through lockDuration
      stalledInterval: 30000,  // Check for stalled jobs every 30 seconds
      prefix: queueOptions.prefix
    });
    
    // Handle job completion
    worker.on('completed', (job) => {
      debug(`${queueName} job ${job?.id || 'unknown'} completed successfully`);
    });
    
    // Handle job failures
    worker.on('failed', (job, err) => {
      const jobData = job?.data ? JSON.stringify(job.data) : 'unknown';
      errorLog(`${queueName} job ${job?.id || 'unknown'} failed: ${err}`, {
        queueName,
        jobId: job?.id,
        jobData: job?.data,
        error: err.message,
        stack: err.stack
      });
    });
    
    // Handle worker-level errors
    worker.on('error', (err) => {
      errorLog(`Error in ${queueName} worker: ${err}`, {
        queueName,
        error: err.message,
        stack: err.stack
      });
    });
    
    return worker;
  } catch (err) {
    errorLog(`Failed to create worker for ${queueName}: ${err}`, {
      queueName,
      error: err.message,
      stack: err.stack
    });
    throw err;
  }
};

// Add this helper to check if io is properly initialized
const getSocketInstance = () => {
  let io = global.io;
  if (!io && typeof global.getSocketIO === 'function') {
    io = global.getSocketIO();
  }
  return io;
};

/**
 * Process a notification job
 * @param {Object} job - The Bull job containing notification data
 * @returns {Promise<void>}
 */
/**
 * Processes a notification job with atomic deduplication and detailed logging
 * @param {Object} job - The Bull job containing notification data
 * @returns {Promise<void>}
 */
async function processNotification(job) {
  const { data } = job;
  const { userId, type, details, title, message, sendAt, messageId, isWebSocketOnly, isFCMOnly, deliveryPreference = 'websocket-first', retry = 0 } = data;
  
  try {
    // Generate a consistent deduplication key
    const deduplicationKey = createDeduplicationKey(userId, type, details);
    const lockTTL = 120; // 2 minutes lock TTL
    
    // If this is a retry attempt, add retry number to the key to avoid conflicts with previous attempts
    const finalDeduplicationKey = retry > 0 ? `${deduplicationKey}:retry${retry}` : deduplicationKey;
    
    // Check if we can acquire a lock for this notification to prevent duplicates
    const lockAcquired = await acquireNotificationLock(finalDeduplicationKey, lockTTL);
    
    if (!lockAcquired) {
      debug(`Skipping duplicate notification ${type} for user ${userId}, deduplication key: ${finalDeduplicationKey}`);
      return { success: true, skipped: true, reason: 'duplicate-deduplication-key' };
    }
    
    // Add global cluster-wide deduplication check for this minute
    // This provides extra protection against multiple servers sending the same notification
    const globalDeduplicationKey = `global:notification:${userId}:${type}:${new Date().toISOString().slice(0, 16)}`;
    
    const isGloballyProcessed = await redisClient.exists(globalDeduplicationKey);
    if (isGloballyProcessed) {
      debug(`[Deduplication] Notification already processed globally: ${globalDeduplicationKey}`);
      return { success: true, skipped: true, reason: 'already-processed-globally' };
    }
    
    // Mark this notification as being processed globally with a 5 minute TTL
    await redisClient.set(globalDeduplicationKey, Date.now().toString(), 'EX', 300);
    
    // Create a unique message ID if not provided
    const notificationId = messageId || `${userId}-${type}-${Date.now()}`;
    
    // Get job attributes to help with deduplication
    const jobId = job.id || '';
    const jobName = job.name || '';
    const attemptsMade = job.attemptsMade || 0;
    
    // Generate a content hash from the notification content
    const messageContent = `${title || ''}:${message || ''}:${details || ''}`;
    const contentHash = require('crypto')
      .createHash('md5')
      .update(messageContent)
      .digest('hex')
      .substring(0, 8);
    
    // Create unique deduplication key if not provided
    // Include the content hash to better identify identical notifications
    const dedupeKey = deduplicationKey || 
      createDeduplicationKey(userId, type, `${details}:${contentHash}`);
    
    // Log job processing attempt with details
    debug(`[Deduplication] Processing notification job ${jobId} (${type}, attempt ${attemptsMade+1}) for user ${userId}`);
    info(`[Deduplication] notificationId: ${notificationId}, contentHash: ${contentHash}, deduplicationKey: ${deduplicationKey}, finalDeduplicationKey: ${finalDeduplicationKey}`);
    
    // Check if this is a retry - if so, add extra deduplication safeguards
    if (attemptsMade > 0) {
      debug(`This is retry #${attemptsMade} for job ${jobId}`);
      
      // For retries, double-check if a similar notification was sent recently
      // by querying a separate Redis key for sent notifications
      const sentKey = `notification:sent:${userId}:${type}:${contentHash}`;
      try {
        const recentlySent = await redisClient.exists(sentKey);
        if (recentlySent) {
          info(`Skipping retry for job ${jobId} - similar notification was already sent`);
          return { success: true, skipped: true, reason: 'already-sent-on-retry' };
        }
      } catch (err) {
        // Continue if Redis check fails
        warn(`Redis error checking sent notification: ${err.message}`);
      }
    }
    
    info(`Processing ${type} notification for user ${userId}: ${title || details}`);
    
    // Create unified notification payload with proper title and message
    const notificationPayload = {
      title: title || details,
      message: message || details,
      type,
      timestamp: new Date().toISOString(),
      messageId: notificationId,
      data: { 
        ...data,
        contentHash,
        title: title || details, // Include title in data for clients that might look for it there
        message: message || details // Include message in data for clients that might look for it there
      }
    };

    // Choose notification delivery method based on preferences and user's connection state
    let deliveryMethod = null;
    let deliveryResult = null;

    try {
      // Helper function to record sent notification for deduplication
      const recordSentNotification = async (channel) => {
        try {
          const sentKey = `notification:sent:${userId}:${type}:${contentHash}`;
          await redisClient.set(sentKey, Date.now().toString(), 'EX', 3600); // 1 hour TTL
          debug(`[Deduplication] ${channel} sentKey set: ${sentKey}`);
        } catch (redisErr) {
          warn(`[Deduplication] Failed to record sent notification: ${redisErr.message}`);
        }
      };

      // Check delivery preferences and connection state
      if (isFCMOnly === true) {
        // Skip WebSocket and use FCM only if explicitly requested
        debug(`[ProcessNotification] Using FCM only as requested for user ${userId}`);
        deliveryMethod = 'fcm';
      } else if (isWebSocketOnly === true) {
        // Skip FCM and use WebSocket only if explicitly requested
        debug(`[ProcessNotification] Using WebSocket only as requested for user ${userId}`);
        deliveryMethod = 'websocket';
      } else if (deliveryPreference === 'fcm-first') {
        // Use FCM first if that's the preference
        debug(`[ProcessNotification] Using FCM first as preferred for user ${userId}`);
        deliveryMethod = 'fcm';
      } else {
        // Default: Try WebSocket first, then fall back to FCM if no active connection
        const socketIO = getSocketInstance();
        if (socketIO) {
          // Add detailed logging of Socket.IO state
          debug(`[ProcessNotification] Socket.IO instance found, attempting WebSocket delivery for user ${userId}`);
          
          // Log Socket.IO rooms and connections if available
          try {
            if (typeof socketIO.sockets === 'object') {
              const allRooms = await socketIO.sockets.adapter.rooms;
              const userRoom = allRooms?.get(`user:${userId}`);
              const roomSize = userRoom?.size || 0;
              
              debug(`[ProcessNotification] User ${userId} room status: exists=${!!userRoom}, connections=${roomSize}`);
              
              // Get all socket IDs to better diagnose connection issues
              if (userRoom) {
                const socketIds = Array.from(userRoom.keys()).join(', ');
                debug(`[ProcessNotification] User ${userId} has the following sockets: ${socketIds}`);
              }
            } else {
              debug(`[ProcessNotification] Could not access Socket.IO rooms information`);
            }
          } catch (roomErr) {
            warn(`[ProcessNotification] Error accessing Socket.IO rooms: ${roomErr.message}`);
          }
          
          // Check if user is connected according to our tracking system
          debug(`[ProcessNotification] Checking connection state for user ${userId}...`);
          const isConnected = await isUserConnected(userId);
          debug(`[ProcessNotification] isUserConnected result for ${userId}: ${isConnected}`);
          
          // If tracking shows user is not connected, try anyway but log it
          if (!isConnected) {
            warn(`[ProcessNotification] User ${userId} shows as disconnected in tracking, but will try WebSocket delivery anyway`);
          }
          
          // Get active sockets in the user's room and verify real connections
          debug(`[ProcessNotification] Fetching active sockets for user ${userId}...`);
          let roomSockets = [];
          try {
            roomSockets = await socketIO.in(`user:${userId}`).fetchSockets();
            debug(`[ProcessNotification] Found ${roomSockets.length} active sockets for user ${userId}`);
            
            // Log each socket ID and connection status
            if (roomSockets.length > 0) {
              roomSockets.forEach((socket, index) => {
                debug(`[ProcessNotification] Socket ${index+1}: ID=${socket.id}, connected=${socket.connected}`);
              });
            }
          } catch (fetchErr) {
            warn(`[ProcessNotification] Error fetching sockets: ${fetchErr.message}`);
            // In case of error, still attempt socket delivery
            roomSockets = []; // Don't force attempt on error - this causes duplicate notifications
          }
          
          // Attempt WebSocket delivery if any sockets exist
          if (roomSockets.length > 0) {
            debug(`[ProcessNotification] Attempting WebSocket delivery to ${roomSockets.length} sockets for user ${userId}`);
            
            // Attempt to deliver via WebSocket
            const socketResult = await sendSocketNotification(socketIO, userId, notificationPayload);
            
            if (socketResult) {
              info(`✅ Successfully sent ${type} notification to user ${userId} via WebSocket`);
              
              // Record the send for deduplication
              await recordSentNotification('WebSocket');
              
              // Log successful delivery for monitoring
              logger.info('NOTIFICATION_AUDIT', {
                event: 'notification_processed',
                userId,
                notificationType: type,
                deliveryMethod: 'websocket',
                messageId: notificationPayload.messageId,
                jobId,
                attemptsMade,
                timestamp: new Date().toISOString()
              });
              
              // Set delivery result
              deliveryResult = { success: true, deliveryMethod: 'websocket' };
            } else {
              warn(`[ProcessNotification] WebSocket delivery unsuccessful despite active sockets, falling back to FCM`);
              // Set FCM as fallback method
              deliveryMethod = 'fcm';
            }
          } else {
            warn(`[ProcessNotification] No active sockets found in room for user ${userId}, falling back to FCM`);
            
            // Clean up stale connection data if tracking showed connected but no actual sockets found
            if (isConnected) {
              warn(`[ProcessNotification] Detected stale connection data for user ${userId}, cleaning up Redis`);
              
              if (redisClient) {
                try {
                  await redisClient.del(`user:sockets:${userId}`);
                  debug(`[ProcessNotification] Cleared stale connection data for user ${userId}`);
                } catch (redisErr) {
                  warn(`[ProcessNotification] Failed to clear stale connection data: ${redisErr.message}`);
                }
              }
            }
            
            // Set FCM as fallback method
            deliveryMethod = 'fcm';
          }
        } else {
          warn(`[ProcessNotification] No Socket.IO instance available, falling back to FCM`);
          // Set FCM as fallback method
          deliveryMethod = 'fcm';
        }
      }
      
      // If WebSocket delivery was successful, we're done
      if (deliveryResult) {
        return deliveryResult;
      }
      
      // If we get here, we need to try FCM delivery
      if (deliveryMethod === 'fcm') {
        debug(`[ProcessNotification] Sending notification via FCM for user ${userId}`);
        
        // Make sure Firebase is initialized
        if (!firebaseInitialized) {
          debug(`[ProcessNotification] Initializing Firebase for first time`);
          try {
            initFirebase();
            firebaseInitialized = true;
            debug(`[ProcessNotification] Firebase initialized successfully`);
          } catch (firebaseError) {
            errorLog(`[ProcessNotification] Firebase initialization failed: ${firebaseError.message}`);
          }
        }
        
        // Generate a consistent FCM deduplication key based on the notification
        const fcmDeduplicationKey = `fcm:sent:${userId}:${type || 'default'}`;
        
        // Pass the deduplication key to sendPushNotification to avoid double-sending
        notificationPayload.tag = type; // Set tag to type for proper deduplication
        notificationPayload.deduplicationKey = fcmDeduplicationKey; // Pass our deduplication key
        
        // Send via push notification service
        const pushResult = await sendPushNotification(userId, notificationPayload);
        
        if (pushResult && pushResult.success) {
          info(`✅ Successfully sent ${type} notification to user ${userId} via FCM`);
          
          // Record the send for deduplication
          await recordSentNotification('FCM');
          
            return { success: true, deliveryMethod: 'fcm', pushResult };
        } else {
          // Log FCM failure details for debugging
          warn(`FCM delivery failed for user ${userId}: ${JSON.stringify(pushResult || {})}`);
        }
      }
      
      // If we got here, both WebSocket and FCM failed
      warn(`Failed to deliver ${type} notification to user ${userId} via any channel`);
      return { success: false, error: 'all-delivery-methods-failed' };
      
    } catch (error) {
      // Log detailed error information for debugging
      errorLog(`Error processing ${type} notification for user ${userId}:`, {
        error: error.message,
        stack: error.stack,
        userId,
        type,
        jobId: job.id,
        attemptsMade
      });
      
      // For critical errors only, release lock to allow retry
      // For non-critical errors (like FCM problems), keep the lock to prevent duplicates
      if (error.message.includes('CRITICAL:')) {
        await releaseNotificationLock(dedupeKey);
      } else {
        // For non-critical errors, keep the lock but record the failure
        try {
          // Store failed attempt in Redis for tracking
          const failureKey = `notification:failure:${userId}:${type}:${contentHash}`;
          await redisClient.set(failureKey, Date.now().toString(), 'EX', 3600); // 1 hour TTL
        } catch (err) {
          // Ignore Redis errors here
        }
      }
      
      throw error;
    }
  } catch (error) {
    errorLog(`Error processing notification job: ${error.message}`, {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Initialize all notification workers
 * @param {Object} queues - BullMQ queues for processing
 * @param {Object} io - Socket.IO instance for WebSocket notifications
 * @returns {Object} Map of initialized workers
 */
const initWorkers = (queues, io) => {
  info('Initializing notification workers...');
  try {
    // Store Socket.IO instance globally for easier access
    global.io = io;
    
    // Initialize Firebase for FCM push notifications
    try {
      initFirebase();
      firebaseInitialized = true;
      info('Firebase initialized successfully for push notifications');
    } catch (err) {
      errorLog('Failed to initialize Firebase, push notifications may not work:', err);
    }
    
    // Create worker for medication reminders
    const medicationWorker = createWorker(QUEUES.MEDICATION_REMINDER, async (job) => {
      const { userId, medicationName, dosage } = job.data;
      
      // Add title and message to job data for processNotification
      job.data.title = 'Medication Reminder 💊';  // Remove emoji to avoid encoding issues
      job.data.message = `Time to take ${medicationName} (${dosage})`;
      job.data.details = `${medicationName}:${dosage}`;
      job.data.type = 'medication'; // Ensure type is explicitly set
      
      return processNotification(job);
    });
    
    // Create worker for meal reminders
    const mealWorker = createWorker(QUEUES.MEAL_REMINDER, async (job) => {
      const { userId, mealType } = job.data;
      
      const mealEmojis = {
        breakfast: '🍳',
        lunch: '🍽️',
        dinner: '🍲',
        snack: '🥨'
      };
      const emoji = mealEmojis[mealType] || '🍽️';
      // Add title and message to job data for processNotification
      job.data.title = `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Time ${emoji}`;  // Remove emoji to avoid encoding issues
      job.data.message = `It's time for your ${mealType}`;
      job.data.details = mealType;
      job.data.type = 'meal'; // Ensure type is explicitly set
      
      return processNotification(job);
    });
    
    // Create worker for activity (inactivity) reminders
    const activityWorker = createWorker(QUEUES.ACTIVITY_CHECK, async (job) => {
      const { userId, lastActivityAt, inactiveHours } = job.data;
      
      // Customize message based on inactivity duration
      let activityMessage = `You've been inactive for ${inactiveHours} hours. Time to move!`;
      if (inactiveHours >= 5) {
        activityMessage = `You've been inactive for ${inactiveHours} hours. Please take a brief walk or stretch!`;
      } else if (inactiveHours >= 3) {
        activityMessage = `You've been inactive for ${inactiveHours} hours. Consider taking a break to move around.`;
      }
      
      // Add title and message to job data for processNotification - fix emoji encoding
      job.data.title = 'Activity Reminder 🚶‍♂️';  // Remove emoji to avoid encoding issues
      job.data.message = activityMessage;
      job.data.details = `${inactiveHours} hours`;
      job.data.type = 'activity'; // Ensure type is explicitly set
      
      return processNotification(job);
    });
    
    // Create worker for watch/wearable connectivity reminders
    const watchWorker = createWorker(QUEUES.WATCH_CHECK, async (job) => {
      const { userId, wearableData = {} } = job.data;
      
      // Create a more personalized message based on wearable status
      let messageTitle = 'Watch Connection Reminder 📱';  // Remove emoji to avoid encoding issues
      let messageText = 'Please connect your watch for health tracking';
      
      // Check if we have wearable data to personalize the message
      if (wearableData && Object.keys(wearableData).length > 0) {
        // If we have lastSyncTime but it's old
        if (wearableData.lastSyncTime) {
          const lastSync = new Date(wearableData.lastSyncTime);
          const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
          
          messageTitle = 'Watch Sync Reminder 📱';  // Remove emoji to avoid encoding issues
          messageText = `Your watch hasn't synced in ${Math.floor(hoursSinceSync)} hours. Please check your connection.`;
        } 
        // If we know what device they have
        else if (wearableData.deviceType) {
          messageText = `Please connect your ${wearableData.deviceType} for health tracking`;
        }
      }
      
      // Add title and message to job data for processNotification
      job.data.title = messageTitle;
      job.data.message = messageText;
      job.data.details = JSON.stringify(wearableData);
      job.data.type = 'watch'; // Ensure type is explicitly set
      
      return processNotification(job);
    });
    
    info('✅ Notification workers initialized successfully');
    
    // Return map of all initialized workers
    return {
      [QUEUES.MEDICATION_REMINDER]: medicationWorker,
      [QUEUES.MEAL_REMINDER]: mealWorker,
      [QUEUES.ACTIVITY_CHECK]: activityWorker,
      [QUEUES.WATCH_CHECK]: watchWorker
    };
  } catch (error) {
    errorLog('Failed to initialize workers:', error);
    throw error;
  }
};

module.exports = { 
  initWorkers,
  // Export for testing
  acquireNotificationLock,
  releaseNotificationLock,
  createDeduplicationKey
};