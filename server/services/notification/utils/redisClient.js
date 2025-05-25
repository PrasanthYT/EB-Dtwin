const { redisClient } = require('@dtwin/config/config/cache');

// Export the redis client for use in other modules
module.exports = redisClient; 