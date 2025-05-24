const { healthMetricService } = require("../../services/user/index");
const activityService = require("../../services/activity/activityService");
const sleepService = require("../../services/sleep/sleepService");
const foodService = require("../../services/food/foodService");

const {
  info,
  fatal,
  successResponse,
  errorResponse,
} = require("@dtwin/config");

const getHealthMetric = async (req, res) => {
  try {
    const { date } = req.query;
    const healthmetric = await healthMetricService.getHealthMetric(
      req.user.userId,
      date
    );

    if (!healthmetric)
      return errorResponse(res, "User is already deleted", healthmetric, 404);
    successResponse(res, "HealthMetric fetched successfully", healthmetric);
  } catch (error) {
    fatal(error);
    errorResponse(res, error);
  }
};

const updateHealthMetric = async (req, res) => {
  try {
    const { date } = req.query;
    const [year, month, day] = date.split("-").map(Number);
    const updatedHealthMetric =
      await healthMetricService.updateHealthMetricByDate(
        year,
        month,
        day,
        req.user.userId,
        req.body
      );

    successResponse(
      res,
      "HealthMetric updated successfully",
      updatedHealthMetric
    );
  } catch (error) {
    fatal(error);
    errorResponse(res, error.message || "HealthMetric update failed", error);
  }
};

const getHeartData = async (req, res) => {
  try {
    const { date } = req.query;
    const HeartData = await healthMetricService.getOrCreateHeartData(
      req.user.userId,
      date
    );

    if (!HeartData)
      return errorResponse(res, "User is already deleted", null, 404);
    successResponse(res, "Heart Rate Data fetched successfully", HeartData);
  } catch (error) {
    fatal(error);
    errorResponse(res, error);
  }
};

const updateHeartData = async (req, res) => {
  try {
    const { date } = req.query;
    const updatedHealthMetric =
      await healthMetricService.updateOrCreateHeartData(
        req.user.userId,
        date,
        req.body
      );

    successResponse(res, "HeartData updated successfully", updatedHealthMetric);
  } catch (error) {
    fatal(error);
    errorResponse(res, error.message || "HeartData update failed", error);
  }
};

const getMonthlyHeartRateData = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { year, month } = req.params;

    const result = await healthMetricService.getMonthlyHeartRateData(
      userId,
      year,
      month
    );

    successResponse(
      res,
      "Monthly heart rate data fetched successfully",
      result
    );
  } catch (error) {
    fatal(error);
    errorResponse(
      res,
      error.message || "An error occurred",
      null,
      error.statusCode || 500
    );
  }
};

const getMonthlyStepsData = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { year, month } = req.params;

    const result = await healthMetricService.getMonthlyStepsData(
      userId,
      year,
      month
    );

    successResponse(res, "Monthly steps data fetched successfully", result);
  } catch (error) {
    fatal(error);
    errorResponse(
      res,
      error.message || "An error occurred",
      null,
      error.statusCode || 500
    );
  }
};

const getMonthlyWeightData = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { year, month } = req.params;

    const result = await healthMetricService.getMonthlyWeightData(
      userId,
      year,
      month
    );

    successResponse(res, "Monthly Weight data fetched successfully", result);
  } catch (error) {
    fatal(error);
    errorResponse(
      res,
      error.message || "An error occurred",
      null,
      error.statusCode || 500
    );
  }
};

const getAllScores = async (req, res) => {
  try {
    const { date } = req.query;
    const userId = req.user.userId;

    const activityResult = await activityService.getDailyActivityScore(
      userId,
      date
    );
    const sleepResult = await sleepService.getDailySleepScore(userId, date);
    const metabolicScore = await foodService.getMetabolicScore(userId, date);
    const foodScore = await foodService.getDailyFoodScore(userId, date);

    const scores = {
      activity_score: activityResult?.activity_score ?? null,
      sleep_score: sleepResult?.sleep_score ?? null,
    };

    // Get health metric data
    const healthMetric = await healthMetricService.getHealthMetric(
      userId,
      date
    );

    info("Activity result:", activityResult);
    info("Sleep result:", sleepResult);
    info("Metabolic score:", metabolicScore);
    info("Health metric:", healthMetric);
    const fullResponse = {
      ...scores,
      health_score: healthMetric?.health_score ?? null,
      food_score: healthMetric?.food_score ?? null,
      metabolic_score: healthMetric?.metabolic_score ?? null,
    };
    info(fullResponse);
    successResponse(res, "HealthMetric fetched successfully", fullResponse);
  } catch (error) {
    fatal(error);
    errorResponse(res, error.message || "score fetching failed", error);
  }
};

module.exports = {
  getHealthMetric,
  updateHealthMetric,
  getHeartData,
  updateHeartData,
  getMonthlyHeartRateData,
  getMonthlyStepsData,
  getMonthlyWeightData,
  getAllScores,
};
