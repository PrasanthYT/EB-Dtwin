const admin = require('firebase-admin');
const { logger, debug, info, warn, error: errorLog } = require('@dtwin/config');
const { redisClient } = require('@dtwin/config/config/cache');
const { UserProfile } = require('@dtwin/shared-database');
const serviceAccount = require('../../../common/constants/firebase-service-account.json');
const { Op } = require('sequelize');
const crypto = require('crypto');

/**
 * Redis-based notification tracking system
 * Provides distributed deduplication across service instances
 */

/**
 * Check if a notification ID was recently sent
 * @param {string} notificationId - Unique notification ID
 * @returns {Promise<boolean>} True if recently sent
 */
const checkRecentNotification = async (notificationId) => {
  if (!redisClient) return false;
  
  try {
    const key = `fcm:notif:${notificationId}`;
    const exists = await redisClient.exists(key);
    return exists === 1;
  } catch (err) {
    warn(`Error checking recent notification: ${err.message}`);
    return false;
  }
};

/**
 * Record a notification as sent in Redis
 * @param {string} notificationId - Unique notification ID
 * @param {number} ttlSeconds - Time to live in seconds
 * @returns {Promise<void>}
 */
const recordSentNotification = async (notificationId, ttlSeconds = 300) => {
  if (!redisClient) return;
  
  try {
    const key = `fcm:notif:${notificationId}`;
    await redisClient.set(key, Date.now().toString(), 'EX', ttlSeconds);
    debug(`Recorded notification in Redis: ${notificationId}`);
  } catch (err) {
    warn(`Error recording sent notification: ${err.message}`);
  }
};

/**
 * Check if user was recently notified about this notification type
 * Uses Redis for distributed rate limiting
 * @param {string} userId - User ID
 * @param {string} notificationType - Type of notification
 * @param {number} cooldownSeconds - Cooldown period in seconds
 * @returns {Promise<boolean>} True if user was recently notified
 */
const checkUserRateLimit = async (userId, notificationType, cooldownSeconds = 5) => {
  if (!redisClient) return false;
  
  try {
    const key = `fcm:ratelimit:${userId}:${notificationType || 'general'}`;
    const lastNotified = await redisClient.get(key);
    
    if (!lastNotified) return false;
    
    const elapsedSeconds = (Date.now() - parseInt(lastNotified)) / 1000;
    const isRateLimited = elapsedSeconds < cooldownSeconds;
    
    if (isRateLimited) {
      debug(`Rate limiting notification to user ${userId} of type ${notificationType} (${elapsedSeconds.toFixed(1)}s < ${cooldownSeconds}s)`);
    }
    
    return isRateLimited;
  } catch (err) {
    warn(`Redis error in rate limit check: ${err.message}`);
    return false;
  }
};

/**
 * Record a user notification for rate limiting
 * @param {string} userId - User ID 
 * @param {string} notificationType - Type of notification
 * @param {number} cooldownSeconds - Cooldown period in seconds
 * @returns {Promise<void>}
 */
const recordUserNotification = async (userId, notificationType, cooldownSeconds = 5) => {
  if (!redisClient) return;
  
  try {
    const key = `fcm:ratelimit:${userId}:${notificationType || 'general'}`;
    await redisClient.set(key, Date.now().toString(), 'EX', cooldownSeconds);
  } catch (err) {
    warn(`Redis error recording user notification: ${err.message}`);
  }
};

/**
 * Initializes Firebase Admin SDK for FCM messaging
 * @returns {boolean} True if initialization was successful
 */
const initFirebase = () => {
  if (admin.apps.length === 0) {
    try {
      let serviceAccountData;
      try {
        // Load Firebase service account credentials from the JSON file
        serviceAccountData = serviceAccount;
        if (!serviceAccountData || !serviceAccountData.project_id) {
          throw new Error('Invalid service account data structure');
        }
      } catch (fileError) {
        errorLog('Firebase service account file error:', fileError);
        throw new Error('Failed to load Firebase credentials: ' + fileError.message);
      }
      
      // Initialize Firebase Admin SDK with the service account credentials
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountData)
      });
      
      // Verify messaging service is available and working
      const messaging = admin.messaging();
      if (!messaging) {
        throw new Error('Firebase messaging service not available');
      }
      
      info('✅ Firebase Admin SDK initialized successfully');
      return true;
    } catch (err) {
      const errorMessage = 'Failed to initialize Firebase Admin SDK: ' + err.message;
      errorLog(errorMessage, { stack: err.stack });
      
      // Fallback to environment variables if service account file fails
      try {
        if (process.env.FIREBASE_CONFIG) {
          const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
          admin.initializeApp({
            credential: admin.credential.cert(firebaseConfig)
          });
          warn('Firebase initialized using environment variables as fallback');
          return true;
        }
      } catch (fallbackError) {
        errorLog('Firebase fallback initialization failed:', fallbackError);
      }
      
      throw new Error(errorMessage);
    }
  } else {
    debug('Firebase Admin SDK already initialized, using existing instance');
    return true;
  }
};

/**
 * Sends a push notification to a user via Firebase Cloud Messaging
 * @param {string} userId - User ID to send notification to
 * @param {Object} notification - Notification payload
 * @returns {Promise<Object>} Result of notification delivery
 */
const sendPushNotification = async (userId, notification) => {
  try {
    if (!userId || !notification) {
      errorLog('Missing userId or notification for sendPushNotification');
      return { success: false, error: 'Missing userId or notification' };
    }

    // Use provided deduplicationKey if available, otherwise generate one
    const deduplicationKey = notification.deduplicationKey || `fcm:sent:${userId}:${notification.tag || 'default'}`;
    const contentHash = generateContentHash(notification);
    const contentOnlyKey = `fcm:content:${contentHash}`;

    // Check if this exact notification (userId + tag) was sent in the last 30 minutes
    const exists = await redisClient.exists(deduplicationKey);
    if (exists) {
      debug(`Duplicate notification skipped for userId: ${userId} and tag: ${notification.tag || 'default'}`);
      return { success: false, error: 'Duplicate notification', reason: 'already-sent' };
    }

    // Also check if similar content was sent in the last 10 minutes (regardless of userId)
    const contentExists = await redisClient.exists(contentOnlyKey);
    if (contentExists) {
      debug(`Similar notification content already sent recently: ${contentHash}`);
      return { success: false, error: 'Similar notification content already sent', reason: 'similar-content' };
    }

    // Record that we sent this notification to this userId with this tag
    // Do this BEFORE sending to prevent race conditions
    await recordSentNotification(deduplicationKey, 1800); // 30 minutes TTL
    
    // Also record the content hash with a shorter TTL
    await redisClient.set(contentOnlyKey, '1');
    await redisClient.expire(contentOnlyKey, 600); // 10 minutes TTL for content-only deduplication

    // Rate limit check - don't send same notification type to user too frequently
    // Using a more precise rate limiting with the notification type and content hash
    const rateLimitKey = `${notification.type || 'general'}:${contentHash}`;
    const isRateLimited = await checkUserRateLimit(userId, rateLimitKey, 5);
    if (isRateLimited) {
      info(`Rate limiting FCM notification to user ${userId} of type ${notification.type || 'general'}`);
      return { 
        success: true, 
        rateLimit: true,
        reason: 'rate-limited',
        deduplicationId: deduplicationKey
      };
    }
    
    // Record this notification attempt for rate limiting
    await recordUserNotification(userId, rateLimitKey, 5);
    
    // Ensure Firebase is initialized before sending notifications
    let firebaseInitialized = false;
    try {
      firebaseInitialized = initFirebase();
    } catch (firebaseError) {
      errorLog('Firebase initialization failed for push notification:', firebaseError);
      return { success: false, error: 'firebase-init-failed', message: firebaseError.message };
    }
    
    // Double-check Firebase availability
    if (!firebaseInitialized) {
      errorLog('Firebase not available for push notification');
      return { success: false, error: 'firebase-unavailable' };
    }
    
    // Get all FCM tokens for the user's devices
    const tokens = await getUserFcmTokens(userId);
    if (!tokens || tokens.length === 0) {
      info(`No FCM tokens found for user ${userId}`);
      return { success: false, reason: 'no-tokens' };
    }
    
    // Dedup tokens to prevent sending to the same token twice
    const uniqueTokens = [...new Set(tokens)];
    
    if (uniqueTokens.length !== tokens.length) {
      debug(`Removed ${tokens.length - uniqueTokens.length} duplicate tokens for user ${userId}`);
      
      // Update the tokens in the database to remove duplicates
      try {
        await UserProfile.update(
          { fcmTokens: uniqueTokens },
          { where: { userId: userId } }
        );
        debug(`Updated user profile with deduplicated tokens for user ${userId}`);
      } catch (err) {
        warn(`Failed to update user profile with deduplicated tokens: ${err.message}`);
      }
    }
    
    // Prepare the FCM message payload with notification and data fields
    const fcmMessage = {
      notification: {
        title: notification.title,
        body: notification.message || notification.body || ''
      },
      data: {}
    };
    
    // Add messageId for client-side deduplication
    const messageId = notification.messageId || deduplicationKey;
    fcmMessage.data.type = String(notification.type || 'general');
    fcmMessage.data.timestamp = String(Date.now());
    fcmMessage.data.notificationId = messageId;
    fcmMessage.data.click_action = 'FLUTTER_NOTIFICATION_CLICK'; // Required for Flutter notification handling
    
    // Ensure title and message are also in data for consistency
    fcmMessage.data.title = String(notification.title || '');
    fcmMessage.data.message = String(notification.message || notification.body || '');
    fcmMessage.data.body = String(notification.message || notification.body || '');
    
    // Ensure all data values are strings (FCM requirement)
    if (notification.data) {
      Object.keys(notification.data).forEach(key => {
        const value = notification.data[key];
        // Convert all values to strings
        if (value === null || value === undefined) {
          fcmMessage.data[key] = '';
        } else if (typeof value === 'object') {
          fcmMessage.data[key] = JSON.stringify(value);
        } else {
          fcmMessage.data[key] = String(value);
        }
      });
    }
    
    // Add high-priority flag to ensure reliable delivery
    fcmMessage.android = {
      priority: 'high',
      ttl: 60 * 60 * 1000, // 1 hour in milliseconds
      notification: {
        channelId: 'high_importance_channel',
        tag: `${notification.type || 'general'}-${contentHash}` // Add tag with content hash to help Android group and deduplicate
      }
    };
    
    // Set notification content-available for iOS to get system wakeup
    fcmMessage.apns = {
      payload: {
        aps: {
          contentAvailable: true,
          mutableContent: true,
          sound: 'default'
        }
      },
      headers: {
        // Ensure the apns-collapse-id does not exceed 64 bytes
        'apns-collapse-id': (() => {
          // Get base components
          const type = notification.type || 'general';
          // Truncate the userId and contentHash if needed to keep total under 64 bytes
          // Reserve 20 chars for hyphens and type
          const maxLength = 64;
          const typeLength = type.length;
          const availableLength = maxLength - typeLength - 4; // 4 chars for hyphens
          
          // Divide remaining space equally between userId and contentHash
          const halfAvailable = Math.floor(availableLength / 2);
          const truncatedUserId = userId.length > halfAvailable ? userId.substring(0, halfAvailable) : userId;
          const truncatedHash = contentHash.length > halfAvailable ? contentHash.substring(0, halfAvailable) : contentHash;
          
          return `${truncatedUserId}-${type}-${truncatedHash}`;
        })()
      }
    };
    
    // Don't try to use sendMulticast as it may not be available in all Firebase Admin SDK versions
    // Instead, use sendToDevice which is more widely supported
    const result = { 
      responses: [],
      successCount: 0,
      failureCount: 0
    };
    
    // Send to each token individually
    debug(`Sending FCM notification to ${uniqueTokens.length} devices for user ${userId}`);
    for (let i = 0; i < uniqueTokens.length; i++) {
      try {
        // Use messaging().send for better compatibility
        const singleResult = await admin.messaging().send({
          token: uniqueTokens[i],
          notification: fcmMessage.notification,
          data: fcmMessage.data,
          android: fcmMessage.android,
          apns: fcmMessage.apns
        });
        
        result.responses.push({ success: true, messageId: singleResult });
        result.successCount++;
        debug(`Successfully sent notification to token ${i+1}/${uniqueTokens.length} for user ${userId}`);
      } catch (err) {
        warn(`Failed to send to token ${uniqueTokens[i].substr(0, 12)}...: ${err.message}`);
        result.responses.push({ success: false, error: err });
        result.failureCount++;
        
        // Track failed tokens for cleanup
        if (err && (
            err.code === 'messaging/invalid-registration-token' || 
            err.code === 'messaging/registration-token-not-registered' ||
            err.message.includes('Requested entity was not found')
        )) {
          // Immediately remove invalid tokens
          try {
            await UserProfile.update(
              { fcmTokens: tokens.filter(t => t !== uniqueTokens[i]) },
              { where: { userId: userId } }
            );
            debug(`Immediately removed invalid token for user ${userId}`);
          } catch (updateErr) {
            warn(`Failed to remove invalid token: ${updateErr.message}`);
          }
        }
      }
    }
    
    // Log notification results for auditing and metrics
    logger.info('NOTIFICATION_AUDIT', {
      event: 'push_notification_sent',
      userId,
      notificationType: notification.type || 'general',
      notificationId: messageId,
      deviceCount: uniqueTokens.length,
      successCount: result.successCount,
      failureCount: result.failureCount,
      deduplicationId: deduplicationKey,
      timestamp: new Date().toISOString()
    });
    
    info(`Push notification sent to user ${userId} on ${result.successCount} of ${uniqueTokens.length} devices`);
    
    return { 
      success: result.successCount > 0, 
      successCount: result.successCount,
      failureCount: result.failureCount,
      notificationId: messageId,
      deduplicationId: deduplicationKey
    };
  } catch (error) {
    errorLog(`Failed to send push notification to user ${userId}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all FCM tokens for a user
 * @param {string} userId - User ID 
 * @returns {Promise<string[]>} Array of FCM tokens
 */
const getUserFcmTokens = async (userId) => {
  try {
    debug(`[getUserFcmTokens] Looking up FCM tokens for user ${userId}`);
    
    if (!UserProfile) {
      errorLog(`[getUserFcmTokens] UserProfile model is not available!`);
      return [];
    }
    
    const userProfile = await UserProfile.findByPk(userId);
    if (!userProfile) {
      debug(`[getUserFcmTokens] No user profile found for user ${userId}`);
      return [];
    }
    
    if (!userProfile.fcmTokens || userProfile.fcmTokens.length === 0) {
      debug(`[getUserFcmTokens] No FCM tokens found for user ${userId} in profile`);
      return [];
    }
    
    debug(`[getUserFcmTokens] Found ${userProfile.fcmTokens.length} tokens for user ${userId}`);
    return userProfile.fcmTokens;
  } catch (error) {
    errorLog(`[getUserFcmTokens] Failed to get FCM tokens for user ${userId}:`, error);
    return [];
  }
};

/**
 * Update a user's FCM token
 * @param {string} userId - User ID
 * @param {string} token - FCM token to add
 * @returns {Promise<boolean>} Success indicator
 */
const updatePushToken = async (userId, token) => {
  try {
    if (!userId || !token) {
      errorLog('Missing userId or token for updatePushToken');
      return false;
    }
    
    // Find user in database
    let userProfile = await UserProfile.findByPk(userId);
    if (!userProfile) {
      errorLog(`User profile not found for userId ${userId}`);
      return false;
    }
    
    // Add token if not already present to avoid duplicates
    const existingTokens = userProfile.fcmTokens || [];
    if (!existingTokens.includes(token)) {
      const updatedTokens = [...existingTokens, token];
      await userProfile.update({ fcmTokens: updatedTokens });
      info(`FCM token added for user ${userId}`);
    } else {
      debug(`FCM token already exists for user ${userId}`);
    }
    
    return true;
  } catch (error) {
    errorLog(`Failed to update FCM token for user ${userId}:`, error);
    return false;
  }
};

/**
 * Remove invalid FCM tokens
 * @param {string} userId - User ID
 * @param {Array} failedTokens - Array of failed tokens with error details
 * @returns {Promise<void>}
 */
const removeInvalidTokens = async (userId, failedTokens) => {
  try {
    if (!failedTokens || failedTokens.length === 0) return;
    
    // Check the structure of failedTokens and extract token values
    let invalidTokens = [];
    
    // Handle different formats of failedTokens
    if (Array.isArray(failedTokens)) {
      if (failedTokens[0] && typeof failedTokens[0] === 'object' && failedTokens[0].token) {
        // Format: [{token: 'abc', error: {...}}, ...]
        invalidTokens = failedTokens
      .filter(item => item.error && (
        item.error.code === 'messaging/invalid-registration-token' || 
            item.error.code === 'messaging/registration-token-not-registered' ||
            (item.error.message && item.error.message.includes('Requested entity was not found'))
      ))
      .map(item => item.token);
      } else if (typeof failedTokens[0] === 'string') {
        // Format: ['token1', 'token2', ...]
        invalidTokens = failedTokens;
      }
    } else if (typeof failedTokens === 'string') {
      // Single token as string
      invalidTokens = [failedTokens];
    }
    
    if (invalidTokens.length === 0) return;
    
    // Update user profile by removing invalid tokens
    const userProfile = await UserProfile.findByPk(userId);
    if (!userProfile) {
      errorLog(`User profile not found for userId ${userId}`);
      return;
    }
    
    const currentTokens = userProfile.fcmTokens || [];
    const validTokens = currentTokens.filter(token => !invalidTokens.includes(token));
    
    // Only update if we actually removed tokens
    if (currentTokens.length !== validTokens.length) {
      // Use userId for the where clause since it's the primary key, not id
      await UserProfile.update(
        { fcmTokens: validTokens },
        { where: { userId: userId } }
      );
      
      info(`Removed ${currentTokens.length - validTokens.length} invalid FCM tokens for user ${userId}`);
    }
  } catch (error) {
    errorLog(`Failed to remove invalid tokens for user ${userId}:`, error);
  }
};

/**
 * Send push notification to multiple devices
 * @param {Object} notification - Notification data including title and body
 * @param {Array<string>} tokens - List of FCM tokens
 * @param {Object} data - Optional data payload
 */
async function sendToMultipleDevices(notification, tokens, data = {}) {
  try {
    debug(`[sendToMultipleDevices] Called with ${tokens ? tokens.length : 0} tokens`);
    
    if (!tokens || tokens.length === 0) {
      debug('[sendToMultipleDevices] No valid tokens provided for push notification');
      return { success: 0, failure: 0, tokens: [] };
    }

    const validTokens = tokens.filter(token => token && typeof token === 'string' && token.length > 20);
    debug(`[sendToMultipleDevices] Filtered to ${validTokens.length} valid tokens`);
    
    if (validTokens.length === 0) {
      debug('[sendToMultipleDevices] All provided tokens were invalid');
      return { success: 0, failure: 0, tokens: [] };
    }

    // Initialize Firebase if not already done
    try {
      debug('[sendToMultipleDevices] Initializing Firebase');
      initFirebase();
      debug('[sendToMultipleDevices] Firebase initialized successfully');
    } catch (error) {
      errorLog('[sendToMultipleDevices] Firebase initialization failed:', error);
      return { success: 0, failure: 0, error: 'firebase-init-failed', tokens: [] };
    }

    // Prepare the message payload structure compatible with messaging().send()
    const message = {
      notification: {
        title: notification.title,
        body: notification.body || notification.message, // Use message field as fallback for body
      },
      data: sanitizeDataPayload(data),
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          priority: 'high',
          channelId: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            contentAvailable: true,
          },
        },
      },
    };

    // Add title and message to data payload for consistency
    if (!message.data.title && notification.title) {
      message.data.title = notification.title;
    }
    if (!message.data.body && (notification.body || notification.message)) {
      message.data.body = notification.body || notification.message;
    }

    const results = {
      success: 0,
      failure: 0,
      failedTokens: [],
      errors: [],
    };

    // Send to each token individually since sendMulticast is not available
    debug(`[sendToMultipleDevices] Attempting to send to ${validTokens.length} tokens`);
    for (const token of validTokens) {
      try {
        const tokenMessage = {
          ...message,
          token, // Add the FCM token to the message
        };

        // Send using messaging().send() which is available in the admin SDK
        debug(`[sendToMultipleDevices] Sending to token: ${token.substring(0, 10)}...`);
        const response = await admin.messaging().send(tokenMessage);
        
        if (response) {
          results.success++;
          info(`[sendToMultipleDevices] Successfully sent message to token: ${token.substring(0, 10)}...`);
        }
      } catch (error) {
        results.failure++;
        results.failedTokens.push(token);
        results.errors.push({
          token: token.substring(0, 10) + '...',
          error: error.message,
          code: error.code || 'unknown',
        });
        
        // Log detailed error information
        errorLog(`FCM send error: ${error.message}`, {
          errorCode: error.code,
          token: token.substring(0, 10) + '...',
        });
        
        // Handle token-specific errors
        if (error.code === 'messaging/invalid-registration-token' || 
            error.code === 'messaging/registration-token-not-registered' ||
            error.message.includes('Requested entity was not found')) {
          // Token is invalid or no longer valid - should be removed from the database
          try {
            await markTokenInvalid(token);
          } catch (dbError) {
            errorLog(`Failed to mark invalid token: ${dbError.message}`);
          }
        }
      }
    }

    // Record metrics for this batch of notifications
    const anyTokenId = validTokens.length > 0 ? 'batch-notification' : 'no-tokens';
    await recordPushNotificationStats(anyTokenId, {
      success: results.success,
      failure: results.failure
    });

    debug(`Push notification results: ${results.success} succeeded, ${results.failure} failed`);
    return results;
  } catch (err) {
    errorLog('Error in sendToMultipleDevices:', err);
    return {
      success: 0,
      failure: tokens ? tokens.length : 0,
      error: err.message
    };
  }
}

/**
 * Mark an FCM token as invalid in the database
 * @param {string} token - The FCM token to invalidate
 */
async function markTokenInvalid(token) {
  try {
    if (!token) {
      debug('No token provided to markTokenInvalid');
      return;
    }
    
    debug(`Marking token as invalid: ${token.substring(0, 10)}...`);
    
    // Find all user profiles that have this token
    const userProfiles = await UserProfile.findAll({
      where: {
        fcmTokens: {
          [Op.contains]: [token] // PostgreSQL-specific ARRAY contains operator
        }
      }
    });
    
    if (!userProfiles || userProfiles.length === 0) {
      debug(`No user profiles found with token ${token.substring(0, 10)}...`);
      return;
    }
    
    // For each user profile, remove the invalid token
    for (const profile of userProfiles) {
      const currentTokens = profile.fcmTokens || [];
      const validTokens = currentTokens.filter(t => t !== token);
      
      if (currentTokens.length !== validTokens.length) {
        await UserProfile.update(
          { fcmTokens: validTokens },
          { where: { userId: profile.userId } }
        );
        debug(`Removed invalid token from user ${profile.userId}`);
      }
    }
  } catch (error) {
    errorLog(`Error marking token as invalid: ${error.message}`);
  }
}

/**
 * Sanitize data payload for FCM (all values must be strings)
 * @param {Object} data - The data payload to sanitize
 * @returns {Object} Sanitized data object with string values
 */
function sanitizeDataPayload(data) {
  const sanitized = {};
  
  if (!data || typeof data !== 'object') {
    return sanitized;
  }
  
  // Convert all values to strings as required by FCM
  Object.keys(data).forEach(key => {
    const value = data[key];
    if (value !== undefined && value !== null) {
      sanitized[key] = typeof value === 'object' 
        ? JSON.stringify(value) 
        : String(value);
    }
  });
  
  return sanitized;
}

/**
 * Records metrics for sent notifications
 * @param {string} userId - User ID who received notification
 * @param {Object} stats - Stats object with success and failure counts
 */
async function recordPushNotificationStats(userId, stats) {
  try {
    // Log notification metrics
    debug(`Notification metrics for user ${userId}: Success=${stats.success}, Failure=${stats.failure}`);
    
    // Here you can implement additional metric recording:
    // - Store in database for analytics
    // - Send to monitoring system
    // - Update user notification preferences based on engagement
    
    return true;
  } catch (err) {
    error('Failed to record notification metrics', { error: err, userId });
    return false;
  }
}

/**
 * Generates a hash from notification content for deduplication
 * @param {Object} notification The notification object
 * @return {string} MD5 hash of the notification content
 */
function generateContentHash(notification) {
  // Extract the important fields from the notification
  const content = {
    title: notification.title || '',
    body: notification.body || notification.message || '',
    tag: notification.tag || 'default',
    data: notification.data || {}
  };
  
  // Create a string representation and hash it
  const contentString = JSON.stringify(content);
  return crypto.createHash('md5').update(contentString).digest('hex');
}

module.exports = {
  sendPushNotification,
  initFirebase,
  updatePushToken,
  getUserFcmTokens,
  // Export for testing
  checkRecentNotification,
  recordSentNotification,
  checkUserRateLimit,
  recordUserNotification,
  sendToMultipleDevices,
  markTokenInvalid,
  sanitizeDataPayload,
  recordPushNotificationStats,
  generateContentHash
};