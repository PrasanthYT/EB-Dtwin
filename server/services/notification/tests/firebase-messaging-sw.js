// Firebase Messaging Service Worker for handling background notifications
console.log('[firebase-messaging-sw.js] Service Worker initialized');

// Import and configure the Firebase SDK
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDuKIj8vPuYujWdbfPVkyYQie9FerBwiCY",
  authDomain: "di-twin.firebaseapp.com",
  projectId: "di-twin",
  storageBucket: "di-twin.firebasestorage.app",
  messagingSenderId: "235797705732",
  appId: "1:235797705732:web:ebac0839cad13ba17f3151",
  measurementId: "G-64SEMKFMSG"
};

// Initialize Firebase and Messaging
let messaging;
try {
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  console.log('[firebase-messaging-sw.js] Firebase initialized');

  // Initialize Firebase Messaging
  messaging = firebase.messaging();
  console.log('[firebase-messaging-sw.js] Firebase Messaging initialized');
  
  // Set up background message handler
  messaging.onBackgroundMessage(function(payload) {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);
    
    // Create a notification ID to prevent duplicates
    const notificationId = createNotificationId(payload);
    
    // Check if notification has been handled already
    if (handledNotifications.has(notificationId)) {
      console.log('[firebase-messaging-sw.js] Skipping already handled notification:', notificationId);
      return;
    }
    
    // Show notification
    const notificationTitle = payload.notification?.title || 'Background Message';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.message || payload.data?.body || 'Background Message body.',
      icon: '/favicon.ico',
      data: payload.data || {},
      tag: notificationId,
      // Important for Android: 
      // Without this, Android will not show the notification
      sound: 'default',
      vibrate: [200, 100, 200]
    };
    
    console.log('[firebase-messaging-sw.js] Showing notification:', notificationTitle, notificationOptions);
    
    // Forward the message to any open client windows
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clients) => {
      if (clients.length > 0) {
        console.log('[firebase-messaging-sw.js] Found clients to forward message to:', clients.length);
        
        // Send to each client
        clients.forEach(client => {
          client.postMessage({
            type: 'fcm-notification',
            payload: payload
          });
        });
      } else {
        console.log('[firebase-messaging-sw.js] No clients found, showing notification directly');
      }
    });
    
    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (error) {
  console.error('[firebase-messaging-sw.js] Firebase initialization error:', error);
}

// Track notifications that have been handled by clients
const handledNotifications = new Set();

// Modify the showNotification function to check if notification has been handled
function showNotification(payload, notificationId) {
  // Skip if the notification has been handled by a client
  if (handledNotifications.has(notificationId)) {
    console.log('[firebase-messaging-sw.js] Skipping notification already handled by client:', notificationId);
    return;
  }

  const notificationTitle = payload.notification?.title || 'Background Message';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.message || payload.data?.body || 'Background Message body.',
    icon: '/favicon.ico',
    data: payload.data || {},
    tag: notificationId,
    sound: 'default',
    vibrate: [200, 100, 200]
  };

  // Show notification
  self.registration.showNotification(notificationTitle, notificationOptions);
}

// Helper function to create a unique ID from notification payload
function createNotificationId(payload) {
  try {
    // Create a string that combines title, body, and a subset of data fields
    const title = payload.notification?.title || '';
    const body = payload.notification?.body || '';
    const dataString = payload.data ? 
      Object.entries(payload.data)
        .filter(([key]) => ['type', 'timestamp', 'userId', 'clientId', 'notificationId'].includes(key))
        .map(([key, value]) => `${key}:${value}`)
        .join(',') 
      : '';
    
    // Special case: if there's a notificationId in the data, use that directly
    if (payload.data?.notificationId) {
      return payload.data.notificationId;
    }
    
    return `${title}|${body}|${dataString}`;
  } catch (e) {
    // Fallback to timestamp if anything goes wrong
    return `notification-${Date.now()}`;
  }
}

// Track active clients that can handle notifications
const activeClients = new Set();

// Handle messages from clients
self.addEventListener('message', (event) => {
  const message = event.data;
  console.log('[firebase-messaging-sw.js] Received message from client:', message);
  
  if (message.type === 'PAGE_ACTIVE' || message.type === 'PAGE_VISIBLE') {
    // Add client to active clients
    activeClients.add(event.source.id);
    console.log('[firebase-messaging-sw.js] Client added to active clients', event.source.id);
  } else if (message.type === 'PAGE_HIDDEN') {
    // Remove client from active clients
    activeClients.delete(event.source.id);
    console.log('[firebase-messaging-sw.js] Client removed from active clients', event.source.id);
  } else if (message.type === 'NOTIFICATION_HANDLED' && message.notificationId) {
    // Mark notification as handled by client
    handledNotifications.add(message.notificationId);
    console.log('[firebase-messaging-sw.js] Notification marked as handled by client:', message.notificationId);
    
    // Expire after 10 seconds
    setTimeout(() => {
      handledNotifications.delete(message.notificationId);
    }, 10000);
  }
});

// Service worker lifecycle events
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker activated');
  return self.clients.claim();
});

// For debugging - handle push events directly
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push event received', event);
  
  if (!event.data) {
    console.log('[firebase-messaging-sw.js] Push event has no data');
    return;
  }
  
  try {
    const data = event.data.json();
    console.log('[firebase-messaging-sw.js] Push event data:', data);
    
    if (!messaging) {
      // If Firebase Messaging isn't working, handle notification manually
      const notificationId = createNotificationId(data);
      event.waitUntil(
        self.registration.showNotification(
          data.notification?.title || 'New Notification',
          {
            body: data.notification?.body || data.data?.message || 'You have a new notification',
            icon: '/favicon.ico',
            data: data.data || {},
            tag: notificationId, // Add tag to prevent duplicates
            sound: 'default',
            vibrate: [200, 100, 200]
          }
        )
      );
    }
  } catch (error) {
    console.error('[firebase-messaging-sw.js] Error handling push event:', error);
  }
}); 