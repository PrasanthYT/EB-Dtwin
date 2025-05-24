const sleepService = require("../../services/sleep/sleepService");
const {
  info,
  fatal,
  successResponse,
  errorResponse,
} = require("@dtwin/config");

const getDailySleepData = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date } = req.params;
    const result = await sleepService.getDailySleepData(userId, date);
    successResponse(res, "fetched successfully", result);
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

const getMonthlySleepData = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { year, month } = req.params;

    const result = await sleepService.getMonthlySleepData(userId, year, month);

    successResponse(res, "Monthly sleep data fetched successfully", result);
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

const getSleepDataInRange = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate, sleepType, minDuration, maxDuration } =
      req.query;

    const result = await sleepService.getSleepDataRange(
      userId,
      startDate,
      endDate,
      sleepType,
      minDuration ? parseFloat(minDuration) : null,
      maxDuration ? parseFloat(maxDuration) : null
    );

    successResponse(res, result.message || "fetched successfully", result);
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

const getBestSleepStage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate } = req.query;

    const result = await sleepService.getBestSleepStage(
      userId,
      startDate,
      endDate
    );
    successResponse(
      res,
      result.message || "Best sleep stage fetched successfully",
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

const postSleepSession = async (req, res) => {
  try {
    const userId = req.user.userId;
    const sleepsessions = req.body;

    const result = await sleepService.postSleepSessions(userId, sleepsessions);
    successResponse(
      res,
      result.message || "Sleep session(s) posted successfully",
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

const getDailySleepScore = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date } = req.params;
    const result = await sleepService.getDailySleepScore(userId, date);
    successResponse(
      res,
      result.message || "Daily sleep score fetched successfully",
      result
    );
  } catch (error) {
    fatal(error);
    errorResponse(
      res,
      error.message || "An error occurred",
      error,
      error.statusCode || 500
    );
  }
};

const getMonthlySleepScore = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { year, month } = req.params;
    const result = await sleepService.getMonthlySleepScore(userId, year, month);
    successResponse(
      res,
      result.message || "Monthly sleep score fetched successfully",
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

const getSleepRecommendations = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date } = req.params;
    console.log(date);
    const result = await sleepService.getSleepRecommendations(userId, date);
    successResponse(
      res,
      result.message || "Sleep recommendations fetched successfully",
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

module.exports = {
  getDailySleepData,
  getMonthlySleepData,
  getSleepDataInRange,
  getBestSleepStage,
  postSleepSession,
  getDailySleepScore,
  getMonthlySleepScore,
  getSleepRecommendations,
};
