// dietPlan.controller.js
const dietPlanService = require("../../services/recommedation/dietPlanService");
const { successResponse, errorResponse } = require("@dtwin/config");
const timezoneUtils = require("../../common/utils/timezone");

/**
 * Get diet plan for a specific date
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getDietPlan = async (req, res) => {
  try {
    // Get date from query params or use current date
    const date =
      req.query.date ||
      timezoneUtils.getCurrentIST().toISOString().split("T")[0];

    const plan = await dietPlanService.getDietPlanForDate(
      req.user.userId,
      date
    );
    successResponse(res, "Diet plan fetched successfully", plan);
  } catch (error) {
    errorResponse(res, error.message || "Failed to get diet plan", error);
  }
};

/**
 * Regenerate a meal for a specific date and meal type
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const regenerateMeal = async (req, res) => {
  try {
    const { mealType } = req.params;
    const date =
      req.query.date ||
      timezoneUtils.getCurrentIST().toISOString().split("T")[0];

    const meal = await dietPlanService.regenerateMeal(
      req.user.userId,
      date,
      mealType
    );
    successResponse(res, "Meal regenerated successfully", meal);
  } catch (error) {
    errorResponse(res, error.message || "Failed to regenerate meal", error);
  }
};

/**
 * Update diet preferences
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updatePreferences = async (req, res) => {
  try {
    await dietPlanService.updateDietPreferences(req.user.userId, req.body);
    successResponse(res, "Diet preferences updated successfully");
  } catch (error) {
    errorResponse(res, error.message || "Failed to update preferences", error);
  }
};

module.exports = {
  getDietPlan,
  regenerateMeal,
  updatePreferences,
};
