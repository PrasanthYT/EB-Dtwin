const sleepService = require('./sleepService');
const { logger, info, errorLog } = require('@dtwin/config');

/**
 * Error types with standardized structure
 */
const SleepServiceErrors = {
  VALIDATION_ERROR: {
    status: 400,
    code: 'SLEEP_VALIDATION_ERROR',
    message: 'Invalid input parameters for sleep service',
  },
  DATA_NOT_FOUND: {
    status: 404,
    code: 'SLEEP_DATA_NOT_FOUND',
    message: 'Requested sleep data not found',
  },
  PROCESSING_ERROR: {
    status: 500,
    code: 'SLEEP_PROCESSING_ERROR',
    message: 'Error processing sleep data',
  },
  STORAGE_ERROR: {
    status: 500,
    code: 'SLEEP_STORAGE_ERROR',
    message: 'Error storing or retrieving sleep data',
  },
  SCORE_CALCULATION_ERROR: {
    status: 500,
    code: 'SLEEP_SCORE_ERROR',
    message: 'Error calculating sleep score',
  }
};

/**
 * Create detailed error response with consistent format
 * @param {Object} errorType - Base error type from SleepServiceErrors
 * @param {String} details - Specific error details
 * @param {Error} originalError - Original error object if available
 * @returns {Object} Detailed error object
 */
const createErrorResponse = (errorType, details = null, originalError = null) => {
  const response = {
    ...errorType,
    timestamp: new Date().toISOString(),
    details: {
      description: details || errorType.message,
      component: 'sleep-service',
    }
  };
  
  if (originalError) {
    response.details.error = originalError.message;
    response.details.stack = originalError.stack;
  }
  
  return response;
};

// Wrapped service methods with enhanced error handling
const sleepServiceWrapper = {
  /**
   * Get daily sleep data with enhanced error handling
   */
  getDailySleepData: async (userId, date) => {
    try {
      if (!userId) {
        throw createErrorResponse(SleepServiceErrors.VALIDATION_ERROR, 'User ID is required');
      }
      
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw createErrorResponse(SleepServiceErrors.VALIDATION_ERROR, 'Invalid date format. Please use YYYY-MM-DD');
      }
      
      const result = await sleepService.getDailySleepData(userId, date);
      
      if (!result) {
        return { 
          data: null, 
          message: `No sleep data found for user ${userId} on ${date}` 
        };
      }
      
      return { data: result };
    } catch (error) {
      // If it's already a formatted error, just rethrow it
      if (error.code && error.status) throw error;
      
      // Handle specific error types
      if (error.message && error.message.includes('Invalid date format')) {
        const formattedError = createErrorResponse(
          SleepServiceErrors.VALIDATION_ERROR, 
          error.message, 
          error
        );
        errorLog('Sleep data validation error:', formattedError);
        throw formattedError;
      }
      
      // Generic error
      const genericError = createErrorResponse(
        SleepServiceErrors.PROCESSING_ERROR,
        `Failed to get daily sleep data for user ${userId} on ${date}`,
        error
      );
      errorLog('Sleep data processing error:', genericError);
      throw genericError;
    }
  },
  
  /**
   * Get monthly sleep data with enhanced error handling
   */
  getMonthlySleepData: async (userId, year, month) => {
    try {
      if (!userId) {
        throw createErrorResponse(SleepServiceErrors.VALIDATION_ERROR, 'User ID is required');
      }
      
      if (!year || !month) {
        throw createErrorResponse(
          SleepServiceErrors.VALIDATION_ERROR, 
          `Missing required parameters: year=${year}, month=${month}. Both are required.`
        );
      }
      
      if (!year || !month || isNaN(Number(year)) || isNaN(Number(month))) {
        throw createErrorResponse(
          SleepServiceErrors.VALIDATION_ERROR, 
          'Invalid year or month format. Year should be YYYY and month should be MM (1-12)'
        );
      }
      
      const numYear = Number(year);
      const numMonth = Number(month);
      
      if (numMonth < 1 || numMonth > 12) {
        throw createErrorResponse(
          SleepServiceErrors.VALIDATION_ERROR, 
          'Month should be between 1 and 12'
        );
      }
      
      // Log request for debugging
      info(`Getting monthly sleep data for user ${userId}, year ${numYear}, month ${numMonth}`);
      
      const result = await sleepService.getMonthlySleepData(userId, numYear, numMonth);
      
      // Check for error in result
      if (result && result.error) {
        throw createErrorResponse(
          SleepServiceErrors.PROCESSING_ERROR,
          result.error,
          { details: result.details }
        );
      }
      
      if (!result || !result.days || result.days.length === 0) {
        return { 
          data: { days: [], summary: { totalDays: 0, averageScore: null } }, 
          message: `No sleep data found for user ${userId} in ${year}-${month.toString().padStart(2, '0')}` 
        };
      }
      
      return { data: result };
    } catch (error) {
      // If it's already a formatted error, just rethrow it
      if (error.code && error.status) throw error;
      
      // If it's a Sequelize error related to month, create a specific error
      if (error.message && error.message.includes('parameter "month" has invalid')) {
        const detailedError = createErrorResponse(
          SleepServiceErrors.VALIDATION_ERROR,
          `Invalid month parameter: ${month}. Month must be a valid number between 1-12.`,
          error
        );
        errorLog('Month parameter validation error:', detailedError);
        throw detailedError;
      }
      
      const genericError = createErrorResponse(
        SleepServiceErrors.PROCESSING_ERROR,
        `Failed to get monthly sleep data for user ${userId} for ${year}-${month}`,
        error
      );
      errorLog('Monthly sleep data processing error:', genericError);
      throw genericError;
    }
  },
  
  /**
   * Get sleep data for date range with enhanced error handling
   */
  getSleepDataForRange: async (userId, startDate, endDate, stageType) => {
    try {
      if (!userId) {
        throw createErrorResponse(SleepServiceErrors.VALIDATION_ERROR, 'User ID is required');
      }
      
      if (!startDate || !endDate) {
        throw createErrorResponse(
          SleepServiceErrors.VALIDATION_ERROR, 
          'Both startDate and endDate are required'
        );
      }
      
      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw createErrorResponse(
          SleepServiceErrors.VALIDATION_ERROR, 
          'Invalid date format. Please use YYYY-MM-DD'
        );
      }
      
      if (start > end) {
        throw createErrorResponse(
          SleepServiceErrors.VALIDATION_ERROR, 
          'Start date must be before or equal to end date'
        );
      }
      
      const result = await sleepService.getSleepDataForRange(userId, startDate, endDate, stageType);
      
      return { data: result };
    } catch (error) {
      // If it's already a formatted error, just rethrow it
      if (error.code && error.status) throw error;
      
      const genericError = createErrorResponse(
        SleepServiceErrors.PROCESSING_ERROR,
        `Failed to get sleep data for range ${startDate} to ${endDate} for user ${userId}`,
        error
      );
      errorLog('Sleep data range processing error:', genericError);
      throw genericError;
    }
  },
  
  /**
   * Get best sleep stage with enhanced error handling
   */
  getBestSleepStage: async (userId, startDate, endDate) => {
    try {
      if (!userId) {
        throw createErrorResponse(SleepServiceErrors.VALIDATION_ERROR, 'User ID is required');
      }
      
      if (!startDate || !endDate) {
        throw createErrorResponse(
          SleepServiceErrors.VALIDATION_ERROR, 
          'Both startDate and endDate are required'
        );
      }
      
      const result = await sleepService.getBestSleepStage(userId, startDate, endDate);
      
      return { data: result };
    } catch (error) {
      // If it's already a formatted error, just rethrow it
      if (error.code && error.status) throw error;
      
      // Handle specific validation errors
      if (error.message && (
        error.message.includes('Invalid date format') || 
        error.message.includes('startDate must be before')
      )) {
        const formattedError = createErrorResponse(
          SleepServiceErrors.VALIDATION_ERROR, 
          error.message, 
          error
        );
        errorLog('Sleep stage validation error:', formattedError);
        throw formattedError;
      }
      
      const genericError = createErrorResponse(
        SleepServiceErrors.PROCESSING_ERROR,
        `Failed to get best sleep stage for user ${userId} between ${startDate} and ${endDate}`,
        error
      );
      errorLog('Best sleep stage processing error:', genericError);
      throw genericError;
    }
  },
  
  /**
   * Post sleep sessions with enhanced error handling
   */
  postSleepSessions: async (userId, sleepSessions) => {
    try {
      if (!userId) {
        throw createErrorResponse(SleepServiceErrors.VALIDATION_ERROR, 'User ID is required');
      }
      
      if (!sleepSessions || !Array.isArray(sleepSessions) || sleepSessions.length === 0) {
        throw createErrorResponse(
          SleepServiceErrors.VALIDATION_ERROR, 
          'Sleep sessions must be a non-empty array'
        );
      }
      
      // Validate each session
      for (const session of sleepSessions) {
        if (!session.startTime || !session.endTime) {
          throw createErrorResponse(
            SleepServiceErrors.VALIDATION_ERROR, 
            'Each sleep session must have startTime and endTime'
          );
        }
      }
      
      const result = await sleepService.postSleepSessions(userId, sleepSessions);
      
      return { 
        data: result,
        message: `Successfully processed ${result?.success?.length || 0} sleep sessions`
      };
    } catch (error) {
      // If it's already a formatted error, just rethrow it
      if (error.code && error.status) throw error;
      
      const genericError = createErrorResponse(
        SleepServiceErrors.STORAGE_ERROR,
        `Failed to save sleep sessions for user ${userId}`,
        error
      );
      errorLog('Sleep session storage error:', genericError);
      throw genericError;
    }
  },
  
  /**
   * Get daily sleep score with enhanced error handling
   */
  getDailySleepScore: async (userId, date) => {
    try {
      if (!userId) {
        throw createErrorResponse(SleepServiceErrors.VALIDATION_ERROR, 'User ID is required');
      }
      
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw createErrorResponse(
          SleepServiceErrors.VALIDATION_ERROR, 
          'Invalid date format. Please use YYYY-MM-DD'
        );
      }
      
      const result = await sleepService.getDailySleepScore(userId, date);
      
      if (!result || result.sleep_score === null || result.sleep_score === undefined) {
        return { 
          data: { sleep_score: null }, 
          message: `No sleep score available for user ${userId} on ${date}` 
        };
      }
      
      return { data: result };
    } catch (error) {
      // If it's already a formatted error, just rethrow it
      if (error.code && error.status) throw error;
      
      const genericError = createErrorResponse(
        SleepServiceErrors.SCORE_CALCULATION_ERROR,
        `Failed to calculate sleep score for user ${userId} on ${date}`,
        error
      );
      errorLog('Sleep score calculation error:', genericError);
      throw genericError;
    }
  },
  
  /**
   * Get sleep recommendations with enhanced error handling
   */
  getSleepRecommendations: async (userId, date) => {
    try {
      if (!userId) {
        throw createErrorResponse(SleepServiceErrors.VALIDATION_ERROR, 'User ID is required');
      }
      
      const result = await sleepService.getSleepRecommendations(userId, date);
      
      return { 
        data: result,
        message: result.length ? `Found ${result.length} recommendations` : 'No recommendations available'
      };
    } catch (error) {
      // If it's already a formatted error, just rethrow it
      if (error.code && error.status) throw error;
      
      const genericError = createErrorResponse(
        SleepServiceErrors.PROCESSING_ERROR,
        `Failed to get sleep recommendations for user ${userId}${date ? ` on ${date}` : ''}`,
        error
      );
      errorLog('Sleep recommendations processing error:', genericError);
      throw genericError;
    }
  }
};

module.exports = sleepServiceWrapper;
