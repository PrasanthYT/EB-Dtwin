// exercisePlan.controller.js
const exercisePlanService = require("../../services/recommedation/exercisePlanService");
const { successResponse, errorResponse } = require("@dtwin/config");
const timezoneUtils = require("../../common/utils/timezone");

/**
 * Get exercise plan for a specific date
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getExercisePlan = async (req, res) => {
  try {
    // Get date from query params or use current date
    const date =
      req.query.date ||
      timezoneUtils.getCurrentIST().toISOString().split("T")[0];

    const plan = await exercisePlanService.getExercisePlanForDate(
      req.user.userId,
      date
    );
    successResponse(res, "Exercise plan fetched successfully", plan);
  } catch (error) {
    errorResponse(res, error.message || "Failed to get exercise plan", error);
  }
};

/**
 * Regenerate a workout for a specific date
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const regenerateWorkout = async (req, res) => {
  try {
    const date =
      req.query.date ||
      timezoneUtils.getCurrentIST().toISOString().split("T")[0];

    const workout = await exercisePlanService.regenerateWorkout(
      req.user.userId,
      date
    );
    successResponse(res, "Workout regenerated successfully", workout);
  } catch (error) {
    errorResponse(res, error.message || "Failed to regenerate workout", error);
  }
};

/**
 * Update exercise preferences
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updatePreferences = async (req, res) => {
  try {
    await exercisePlanService.updateExercisePreferences(
      req.user.userId,
      req.body
    );
    successResponse(res, "Exercise preferences updated successfully");
  } catch (error) {
    errorResponse(res, error.message || "Failed to update preferences", error);
  }
};

module.exports = {
  getExercisePlan,
  regenerateWorkout,
  updatePreferences,
};
