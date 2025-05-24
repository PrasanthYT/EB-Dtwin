const { successResponse, errorResponse } = require("@dtwin/config");
const {diseaseService} = require("../../services/ml");

/**
 * Predict disease based on user data
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */

const predictDisease = async (req, res) => {
  try {
    const userId = req.user.userId;
    const data = req.body;

    // Validate input data
    if (!data || Object.keys(data).length === 0) {
      return errorResponse(res, "No data provided for prediction");
    }

    // Predict disease using the service
    const prediction = diseaseService.predictDisease(userId, data);
    
    // Return success response with prediction result
    successResponse(res, "Disease prediction successful", prediction);
  } catch (error) {
    errorResponse(res, error.message || "Failed to predict disease", error);
  }
};

module.exports = {
  predictDisease
};