const profileRepository = require("../../user/repositories/userProfileRepository");

const getHealthScore = async (userId) => {
  try {
    if (!userId) {
      throw {
        status: 400,
        message: "User ID is required",
        code: "MISSING_USER_ID"
      };
    }
    
    //generate score for user
    const userData = await profileRepository.findById(userId);

    if (!userData) {
      throw {
        status: 404,
        message: "User profile not found",
        code: "USER_NOT_FOUND",
        details: { userId }
      };
    }
    
    const score = await healthScoreML(userData);
    
    if (score === null || score === undefined) {
      throw {
        status: 500,
        message: "Failed to calculate health score",
        code: "SCORE_CALCULATION_ERROR"
      };
    }
    
    const update = await profileRepository.updateProfile(userId, { health_score: score });
    
    if (!update) {
      throw {
        status: 500,
        message: "Failed to update user profile with health score",
        code: "PROFILE_UPDATE_ERROR",
        details: { userId, score }
      };
    }
    
    return await profileRepository.getHealthScore(userId);
  } catch (error) {
    // Rethrow custom errors
    if (error.status) throw error;
    
    // Convert standard errors to detailed errors
    if (error.name === "ValidationError") {
      throw {
        status: 400,
        message: "Invalid user data format",
        code: "VALIDATION_ERROR",
        details: error.message
      };
    }
    
    // Generic error handling
    throw {
      status: 500,
      message: "Error processing health score request",
      code: "HEALTH_SCORE_ERROR",
      details: error.message
    };
  }
};

const healthScoreML = async (data) => {
  try {
    // ML model to calculate health score
    // Placeholder implementation
    return 55;
  } catch (error) {
    throw {
      status: 500,
      message: "Error in ML processing",
      code: "ML_MODEL_ERROR",
      details: error.message
    };
  }
};

module.exports = {
  getHealthScore,
};
