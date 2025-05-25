const { logger,info, warn, errorLog } = require('@dtwin/config');

/**
 * Gets metrics for a specific queue
 * @param {Object} queue - The queue instance to get metrics for
 * @param {Object} options - Options for retrieving metrics
 * @returns {Object} The queue metrics
 */
const getQueueMetrics = async (queue, options = {}) => {
  const { ignoreCompleted = false } = options;
  
  try {
    if (!queue) {
      return {
        error: true,
        message: 'Queue instance not provided'
      };
    }
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount()
    ]);
    
    // Calculate total jobs, optionally ignoring completed jobs
    const total = waiting + active + (ignoreCompleted ? 0 : completed) + failed + delayed;
    
    const health = determineQueueHealth(waiting, active, failed);
    return {
      name: queue.name,
      counts: {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total
      },
      health
    };
  } catch (err) {
    errorLog(`Error getting metrics for queue ${queue?.name || 'unknown'}:`, err);
    return {
      error: true,
      message: `Failed to get queue metrics: ${err.message}`
    };
  }
};

/**
 * Determines the health status of a queue based on its metrics
 */
const determineQueueHealth = (waiting, active, failed) => {
  const waitingThresholdWarning = 100;
  const waitingThresholdError = 500;
  const failedThresholdWarning = 5;
  const failedThresholdError = 20;
  let status = 'healthy';
  let issues = [];
  if (waiting > waitingThresholdError) {
    status = 'error';
    issues.push(`High backlog (${waiting} waiting jobs)`);
  } else if (waiting > waitingThresholdWarning) {
    status = status === 'error' ? 'error' : 'warning';
    issues.push(`Moderate backlog (${waiting} waiting jobs)`);
  }
  if (failed > failedThresholdError) {
    status = 'error';
    issues.push(`High failure rate (${failed} failed jobs)`);
  } else if (failed > failedThresholdWarning) {
    status = status === 'error' ? 'error' : 'warning';
    issues.push(`Moderate failure rate (${failed} failed jobs)`);
  }
  if (active > 10 && waiting > 100) {
    status = 'warning';
    issues.push(`Possible stalled queue (${active} active, ${waiting} waiting)`);
  }
  return {
    status,
    issues
  };
};

/**
 * Gets metrics for all queues in the system
 * Only includes queues that have been explicitly initialized
 * @param {Object} queues - Map of queue instances
 * @param {Object} options - Options for retrieving metrics
 * @returns {Object} Metrics for all queues and system health
 */
const getAllQueueMetrics = async (queues, options = {}) => {
  if (!queues) {
    return {
      error: true,
      message: 'No queues provided'
    };
  }
  try {
    // Get only the explicitly registered queue names
    const queueNames = Object.keys(queues);
    
    // Only process queues that actually exist and have been initialized
    const metricsPromises = queueNames
      .filter(name => queues[name] && typeof queues[name].getWaitingCount === 'function')
      .map(name => getQueueMetrics(queues[name], options));
    
    const allMetrics = await Promise.all(metricsPromises);
    const metrics = {};
    
    // Map only the valid metrics back to their queue names
    allMetrics.forEach((queueMetric, index) => {
      if (!queueMetric.error) {
        metrics[queueMetric.name] = queueMetric;
      } else {
        // Include errored metrics with a clear error status
        metrics[queueNames[index]] = {
          error: true,
          message: queueMetric.message
        };
      }
    });
    
    const systemHealth = determineSystemHealth(allMetrics);
    return {
      timestamp: new Date().toISOString(),
      systemHealth,
      queues: metrics
    };
  } catch (err) {
    errorLog('Error getting metrics for all queues:', err);
    return {
      error: true,
      message: `Failed to get metrics for all queues: ${err.message}`
    };
  }
};

/**
 * Determines the overall health of the queue system
 */
const determineSystemHealth = (queueMetrics) => {
  let status = 'healthy';
  const issues = [];
  queueMetrics.forEach(metric => {
    if (metric.health && metric.health.status === 'error') {
      status = 'error';
      issues.push(`Queue ${metric.name || 'unknown'} in error state`);
    } else if (metric.health && metric.health.status === 'warning' && status !== 'error') {
      status = 'warning';
      issues.push(`Queue ${metric.name || 'unknown'} in warning state`);
    }
  });
  return {
    status,
    issues
  };
};

/**
 * Starts periodic monitoring of all queues
 * Logs metrics and issues at the specified interval
 */
const startQueueMonitoring = (queues, interval = 300000, options = {}) => {
  if (!queues) {
    errorLog('Cannot start queue monitoring: no queues provided');
    return () => {};
  }
  info(`Starting queue monitoring with ${interval}ms interval`);
  const monitoringJob = setInterval(async () => {
    try {
      const metrics = await getAllQueueMetrics(queues, options);
      logger.info('QUEUE_METRICS', metrics);
      if (metrics.systemHealth && metrics.systemHealth.status === 'error') {
        errorLog('Queue system in ERROR state:', metrics.systemHealth.issues.join(', '));
      } else if (metrics.systemHealth && metrics.systemHealth.status === 'warning') {
        warn('Queue system in WARNING state:', metrics.systemHealth.issues.join(', '));
      }
      Object.keys(metrics.queues || {}).forEach(queueName => {
        const queueMetric = metrics.queues[queueName];
        if (queueMetric.counts && queueMetric.counts.failed > 0) {
          warn(`Queue ${queueName} has ${queueMetric.counts.failed} failed jobs`);
        }
      });
    } catch (err) {
      errorLog('Error in queue monitoring job:', err);
    }
  }, interval);
  return () => {
    info('Stopping queue monitoring');
    clearInterval(monitoringJob);
  };
};

module.exports = {
  getQueueMetrics,
  getAllQueueMetrics,
  startQueueMonitoring
}; 