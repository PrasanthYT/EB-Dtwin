const { redisClient, setCache, getCache, delCache } = require('@dtwin/config/config/cache');
const { logger, info, errorLog, warn, debug } = require('@dtwin/config');

// Redis key prefixes used to track socket connections and user associations
const SOCKET_USER_PREFIX = 'socket:user:';  // Maps socket IDs to user IDs
const USER_SOCKETS_PREFIX = 'user:sockets:'; // Maps user IDs to their socket IDs

/**
 * Distributed and resilient socket connection tracking
 * Uses both in-memory and Redis storage for performance and reliability
 */

// In-memory tracking of connected users (faster than Redis lookups for frequent operations)
const connectedUsers = new Map();

// Periodic reliability check interval (milliseconds)
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Synchronize in-memory user connections with Redis
 * This prevents inconsistencies between memory and persistent storage
 * @returns {Promise<void>}
 */
const syncConnectionsWithRedis = async () => {
  if (!redisClient) return;
  
  try {
    // Get all currently connected users from in-memory map
    const inMemoryUsers = new Set(connectedUsers.keys());
    
    // Get all user socket keys from Redis
    const userKeys = await redisClient.keys(`${USER_SOCKETS_PREFIX}*`);
    const redisUsers = new Set(userKeys.map(key => key.replace(USER_SOCKETS_PREFIX, '')));
    
    // Find users in Redis but not in memory (potential orphaned connections)
    const orphanedUsers = [...redisUsers].filter(userId => !inMemoryUsers.has(userId));
    
    // Handle any orphaned user connections
    for (const userId of orphanedUsers) {
      try {
        // Check if the user actually has any sockets in Redis
        const sockets = await redisClient.smembers(`${USER_SOCKETS_PREFIX}${userId}`);
        if (!sockets || sockets.length === 0) {
          // No sockets found, clean up Redis entry
          await delCache(`${USER_SOCKETS_PREFIX}${userId}`);
          debug(`Cleaned up orphaned user entry for ${userId} (no sockets)`);
        } else {
          // User has sockets in Redis but not in memory - restore the connection record
          debug(`Restoring user ${userId} connection record (${sockets.length} sockets)`);
          connectedUsers.set(userId, new Set(sockets));
        }
      } catch (err) {
        warn(`Error handling orphaned user ${userId}: ${err.message}`);
      }
    }
    
    debug(`Connection sync complete: ${inMemoryUsers.size} in-memory users, ${redisUsers.size} Redis users`);
  } catch (err) {
    warn(`Error syncing connections with Redis: ${err.message}`);
  }
};

/**
 * Initialize the Socket.IO service for real-time notifications
 * @param {Object} io - Socket.IO server instance
 * @returns {Function} Cleanup function
 */
const initSocketService = (io) => {
  if (!io) {
    errorLog('Socket.IO instance not provided to initSocketService');
    return () => {};
  }
  
  info('Initializing Socket service for real-time notifications');
  
  // Add a diagnostic handler for checking rooms and connections
  io.on('connection', (socket) => {
    // Handle the standard connection
    handleSocketConnection(socket, io);
    
    // Add diagnostic event handlers
    socket.on('check-connection', async (data, callback) => {
      try {
        const userId = socket.userId;
        if (!userId) {
          if (typeof callback === 'function') {
            callback({ error: 'Not authenticated' });
          }
          return;
        }
        
        // Get connection status
        const isConnected = await isUserConnected(userId);
        const socketCount = await getUserSocketCount(userId);
        const socketRoom = io.sockets.adapter.rooms.get(`user:${userId}`);
        const roomSize = socketRoom ? socketRoom.size : 0;
        
        // Get all connections for user
        const allSockets = [];
        if (connectedUsers.has(userId)) {
          allSockets.push(...Array.from(connectedUsers.get(userId)));
        }
        
        const connectionData = {
          userId,
          connected: isConnected,
          socketId: socket.id,
          inRoom: socketRoom ? socketRoom.has(socket.id) : false,
          socketCount,
          roomSize,
          allSockets,
          timestamp: new Date().toISOString()
        };
        
        debug(`Connection check for user ${userId}: ${JSON.stringify(connectionData)}`);
        
        // Return connection info via callback
        if (typeof callback === 'function') {
          callback(connectionData);
        }
        
        // Also emit to the socket
        socket.emit('connection-status', connectionData);
      } catch (err) {
        warn(`Error in check-connection handler: ${err.message}`);
        if (typeof callback === 'function') {
          callback({ error: err.message });
        }
      }
    });
    
    // Add a heartbeat handler to keep connections alive
    socket.on('heartbeat', () => {
      socket.emit('heartbeat-ack', { timestamp: Date.now() });
    });
  });
  
  // Middleware for authentication and rate limiting
  io.use(async (socket, next) => {
    try {
      // Authentication check
      const { userId } = socket.handshake.auth || {};
      if (!userId) {
        debug('Socket connection rejected - missing userId');
        return next(new Error('Authentication required'));
      }
      
      // Rate limiting for connections
      const clientIp = socket.handshake.address;
      const rateLimitKey = `ratelimit:socket:${clientIp}`;
      
      // Check if client has exceeded the connection rate limit (60 per minute)
      if (redisClient) {
        const currentRequests = await getCache(rateLimitKey) || 0;
        if (currentRequests >= 60) { 
          debug(`Rate limit exceeded for IP ${clientIp}`);
          return next(new Error('Rate limit exceeded'));
        }
        // Increment and set expiry for rate limit counter
        await setCache(rateLimitKey, parseInt(currentRequests) + 1, 60);
      }
      
      // Store user ID in socket for easier access later
      socket.userId = userId;
      next();
    } catch (err) {
      warn(`Socket middleware error: ${err.message}`);
      next(); // Continue despite error to prevent service disruption
    }
  });
  
  // Start periodic connection synchronization with Redis
  const syncInterval = setInterval(syncConnectionsWithRedis, SYNC_INTERVAL);
  
  // Perform initial sync in the background
  setTimeout(() => {
    syncConnectionsWithRedis().catch(err => {
      warn(`Initial connection sync error: ${err.message}`);
    });
  }, 10000); // 10-second delay
  
  info('✅ Socket service initialized successfully');
  
  // Return cleanup function
  return () => {
    clearInterval(syncInterval);
    info('Socket service cleanup: sync interval cleared');
  };
};

/**
 * Handle a new socket connection
 * @param {Object} socket - Socket.IO socket
 * @param {Object} io - Socket.IO server instance
 */
const handleSocketConnection = (socket, io) => {
  // Extract user ID from socket authentication data
  const userId = socket.userId || socket.handshake.auth?.userId;
  
  // Reject connections without user identification
  if (!userId) {
    errorLog('Socket connected without userId - disconnecting');
    socket.disconnect(true);
    return;
  }
  
  info(`User ${userId} connected via WebSocket (socketId: ${socket.id})`);
  
  // Log detailed connection info
  debug(`Connection details for user ${userId}: IP=${socket.handshake.address}, transport=${socket.conn.transport.name}`);
  
  // Track connected socket in memory map for faster lookups
  if (!connectedUsers.has(userId)) {
    connectedUsers.set(userId, new Set());
  }
  connectedUsers.get(userId).add(socket.id);
  
  // Store connection in Redis for persistence across service restarts
  if (redisClient) {
    redisClient.sadd(`${USER_SOCKETS_PREFIX}${userId}`, socket.id)
      .catch(err => warn(`Redis error storing socket connection: ${err.message}`));
  }
  
  // Add socket to user-specific room for targeted messaging
  socket.join(`user:${userId}`);
  
  // Notify the client they are connected
  socket.emit('socket-connected', { 
    status: 'connected',
    userId,
    socketId: socket.id,
    timestamp: new Date().toISOString()
  });
  
  // Set up event handlers
  
  // Handle explicit disconnect request
  socket.on('disconnect', () => {
    handleSocketDisconnect(socket, userId);
  });
  
  // Handle connection errors
  socket.on('error', (err) => {
    warn(`Socket error for user ${userId}: ${err.message}`);
    handleSocketDisconnect(socket, userId);
  });
  
  // Handle ping/heartbeat to detect client liveness
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });
};

/**
 * Handle a socket disconnection
 * @param {Object} socket - Socket.IO socket
 * @param {string} userId - User ID
 */
const handleSocketDisconnect = (socket, userId) => {
  info(`User ${userId} disconnected (socketId: ${socket.id})`);
  
  // Remove from in-memory tracking
  if (connectedUsers.has(userId)) {
    const userSockets = connectedUsers.get(userId);
    userSockets.delete(socket.id);
    
    // Remove user entry if no more active sockets
    if (userSockets.size === 0) {
      connectedUsers.delete(userId);
    }
    
    // Log how many connections remain for this user
    debug(`User ${userId} has ${userSockets.size} socket connections remaining`);
  }
  
  // Remove from Redis
  if (redisClient) {
    redisClient.srem(`${USER_SOCKETS_PREFIX}${userId}`, socket.id)
      .catch(err => warn(`Redis error removing socket connection: ${err.message}`));
  }
};

/**
 * Send a notification to a user via WebSocket
 * @param {Object} io - Socket.IO server instance
 * @param {string} userId - User ID to send notification to
 * @param {Object} message - Notification message payload
 * @returns {Promise<boolean>} Success indicator
 */
const sendSocketNotification = async (io, userId, message) => {
  try {
    // Validate required parameters
    if (!io || !userId || !message) {
      errorLog('Missing required parameters for socket notification', {
        hasIo: !!io,
        hasUserId: !!userId,
        hasMessage: !!message
      });
      return false;
    }
    
    // Check if user is currently connected - no need to send if not
    // First check in-memory for performance
    let isConnected = connectedUsers.has(userId) && connectedUsers.get(userId).size > 0;
    
    // Double-check with Socket.IO's room information for accuracy
    try {
      const room = io.sockets.adapter.rooms.get(`user:${userId}`);
      const actualConnections = room ? room.size : 0;
      
      // If our tracking shows connected but room is empty, we have a state mismatch
      if (isConnected && actualConnections === 0) {
        warn(`Connection state mismatch for user ${userId}: tracked as connected but room is empty`);
        isConnected = false;
        
        // Clean up tracking data
        connectedUsers.delete(userId);
        if (redisClient) {
          await redisClient.del(`${USER_SOCKETS_PREFIX}${userId}`);
        }
      } 
      // If our tracking shows disconnected but room has connections, fix our tracking
      else if (!isConnected && actualConnections > 0) {
        warn(`Connection state mismatch for user ${userId}: tracked as disconnected but has ${actualConnections} connections`);
        isConnected = true;
        
        // Get socket IDs from room
        const socketIds = Array.from(room.keys());
        connectedUsers.set(userId, new Set(socketIds));
        
        // Update Redis
        if (redisClient) {
          await redisClient.sadd(`${USER_SOCKETS_PREFIX}${userId}`, ...socketIds);
        }
      }
      
      // Log the accurate connection state
      debug(`User ${userId} connection state: tracked=${connectedUsers.has(userId) ? connectedUsers.get(userId).size : 0}, actual=${actualConnections}`);
    } catch (roomErr) {
      warn(`Error checking room for user ${userId}: ${roomErr.message}`);
      // Continue with our tracking data if room check fails
    }
    
    if (!isConnected) {
      debug(`User ${userId} is not connected to WebSocket - notification not delivered`);
      return false;
    }
    
    // Add timestamp and ID if not already present
    const notificationWithTimestamp = {
      ...message,
      timestamp: message.timestamp || new Date().toISOString(),
      id: message.id || `${message.type || 'notification'}-${Date.now()}`
    };
    
    // Emit notification to all of user's connected devices via Socket.IO room
    io.to(`user:${userId}`).emit('notification', notificationWithTimestamp);
    
    // Log notification delivery for auditing and debugging
    logger.info('NOTIFICATION_AUDIT', {
      event: 'socket_notification_sent',
      userId,
      notificationType: message.type || 'general',
      socketCount: await getUserSocketCount(userId),
      title: message.title,
      timestamp: new Date().toISOString()
    });
    
    debug(`Sent WebSocket notification to user ${userId}`);
    return true;
  } catch (err) {
    errorLog(`Error sending WebSocket notification to user ${userId}:`, {
      error: err.message,
      stack: err.stack
    });
    return false;
  }
};

/**
 * Check if a user is currently connected via WebSocket
 * @param {string} userId - User ID to check
 * @returns {Promise<boolean>} True if user is connected
 */
const isUserConnected = async (userId) => {
  if (!userId) return false;
  // Check in-memory first for performance
  if (connectedUsers.has(userId) && connectedUsers.get(userId).size > 0) {
    debug(`User ${userId} is connected with ${connectedUsers.get(userId).size} sockets (in-memory check)`);
    return true;
  }
  
  // If not in memory, fallback to checking Redis
  if (redisClient) {
    try {
      const socketCount = await redisClient.scard(`${USER_SOCKETS_PREFIX}${userId}`);
      if (socketCount > 0) {
        debug(`User ${userId} is connected with ${socketCount} sockets (Redis check)`);
        
        // If found in Redis but not in memory, restore to memory for future checks
        const sockets = await redisClient.smembers(`${USER_SOCKETS_PREFIX}${userId}`);
        connectedUsers.set(userId, new Set(sockets));
        return true;
      }
    } catch (err) {
      warn(`Error checking Redis for user connection: ${err.message}`);
    }
  }
  
  debug(`User ${userId} is not connected (both in-memory and Redis checks)`);
  return false;
};

/**
 * Get detailed connection statistics
 * @returns {Promise<Object>} Connection statistics
 */
const getConnectionStats = async () => {
  try {
    // In-memory stats
    const memoryUserCount = connectedUsers.size;
    let memoryTotalSockets = 0;
    
    for (const sockets of connectedUsers.values()) {
      memoryTotalSockets += sockets.size;
    }
    
    let redisStats = {
      userCount: 0,
      socketCount: 0,
      userSocketCounts: {}
    };
    
    // Redis stats if available
    if (redisClient) {
      try {
        // Get all user socket keys from Redis
        const keys = await redisClient.keys(`${USER_SOCKETS_PREFIX}*`);
        const userIds = keys.map(key => key.replace(USER_SOCKETS_PREFIX, ''));
        
        const userSocketCounts = {};
        let totalSockets = 0;
        
        // Count sockets for each user
        for (const userId of userIds) {
          const members = await redisClient.smembers(`${USER_SOCKETS_PREFIX}${userId}`);
          userSocketCounts[userId] = members.length;
          totalSockets += members.length;
        }
        
        redisStats = {
          userCount: userIds.length,
          socketCount: totalSockets,
          userSocketCounts
        };
      } catch (redisErr) {
        warn(`Error getting Redis connection stats: ${redisErr.message}`);
      }
    }
    
    return {
      inMemory: {
        connectedUsers: memoryUserCount,
        totalSockets: memoryTotalSockets,
        users: Array.from(connectedUsers.keys())
      },
      redis: redisStats,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    errorLog('Error getting connection stats:', err);
    return {
      error: err.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Get a list of all connected user IDs
 * @returns {string[]} Array of connected user IDs
 */
const getConnectedUsers = () => {
  return Array.from(connectedUsers.keys());
};

/**
 * Get the number of sockets for a specific user
 * @param {string} userId - User ID to check
 * @returns {Promise<number>} Socket count
 */
const getUserSocketCount = async (userId) => {
  if (!userId) return 0;
  
  // Check in-memory first
  if (connectedUsers.has(userId)) {
    return connectedUsers.get(userId).size;
  }
  
  // Fallback to Redis if available
  if (redisClient) {
    try {
      return await redisClient.scard(`${USER_SOCKETS_PREFIX}${userId}`);
    } catch (err) {
      warn(`Error getting socket count from Redis: ${err.message}`);
    }
  }
  
  return 0;
};

module.exports = {
  initSocketService,
  sendSocketNotification,
  isUserConnected,
  getConnectionStats,
  getConnectedUsers,
  getUserSocketCount,
  // Export for testing
  syncConnectionsWithRedis
}; 