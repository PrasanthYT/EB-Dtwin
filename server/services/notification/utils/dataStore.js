/**
 * Simple in-memory data stores for notification service
 * This provides temporary storage between service restarts
 */

// Store for tracking user's last activity time
// This helps with more accurate activity checking between database updates
const lastActivityStore = new Map();

// Store for tracking notification deduplication
// Used to prevent duplicate notifications in certain scenarios
const notificationStore = new Map();

// Clean up entries older than the specified time
const cleanupStores = () => {
  const now = Date.now();
  const activityTTL = 24 * 60 * 60 * 1000; // 24 hours
  const notificationTTL = 30 * 60 * 1000;  // 30 minutes
  
  // Clean up old activity entries
  for (const [userId, timestamp] of lastActivityStore.entries()) {
    if (now - new Date(timestamp).getTime() > activityTTL) {
      lastActivityStore.delete(userId);
    }
  }
  
  // Clean up old notification entries
  for (const [notificationId, timestamp] of notificationStore.entries()) {
    if (now - timestamp > notificationTTL) {
      notificationStore.delete(notificationId);
    }
  }
};

// Set up periodic cleanup to prevent memory leaks
setInterval(cleanupStores, 60 * 60 * 1000); // Run hourly

module.exports = {
  lastActivityStore,
  notificationStore,
  
  // Update a user's last activity time
  updateUserActivity: (userId, timestamp = new Date().toISOString()) => {
    lastActivityStore.set(userId, timestamp);
    return timestamp;
  },
  
  // Track a notification for deduplication
  trackNotification: (notificationId) => {
    notificationStore.set(notificationId, Date.now());
  },
  
  // Check if a notification was recently sent
  wasNotificationSentRecently: (notificationId) => {
    return notificationStore.has(notificationId);
  }
}; 