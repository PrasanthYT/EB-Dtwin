const { info, errorLog } = require('@dtwin/config');
const checkRedisHealth = async (redisClient) => {
  try {
    if (!redisClient) {
      return { 
        status: 'error', 
        message: 'Redis client not initialized',
        connected: false
      };
    }
    const pingResult = await redisClient.ping();
    if (pingResult !== 'PONG') {
      return {
        status: 'error',
        message: 'Redis connection failed',
        connected: false
      };
    }
    const info = await redisClient.info();
    return {
      status: 'ok',
      message: 'Redis connection healthy',
      connected: true,
      info: {
        uptime: info.server?.uptime_in_seconds || 'unknown',
        memory: info.memory?.used_memory_human || 'unknown',
        clients: info.clients?.connected_clients || 'unknown'
      }
    };
  } catch (err) {
    errorLog('Redis health check failed:', err);
    return {
      status: 'error',
      message: `Redis health check failed: ${err.message}`,
      connected: false,
      error: err.message
    };
  }
};
module.exports = {
  checkRedisHealth
}; 