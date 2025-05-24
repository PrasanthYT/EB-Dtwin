const activityService = require("../../services/activity/activityService");
const {
  info,
  fatal,
  successResponse,
  errorResponse,
} = require("@dtwin/config");

const getDailyActivityScore = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date } = req.params;
    const result = await activityService.getDailyActivityScore(userId, date);
    successResponse(res, "Activity Score Fetched Successfully", result);
  } catch (error) {
    fatal(error);
    errorResponse(res, error.message);
  }
};

const getTopActivitiesForDay = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date } = req.params;
    const limit = req.query.all === "true" ? 50 : 3;
    const result = await activityService.getTopActivitiesForDay(
      userId,
      date,
      limit
    );
    successResponse(res, "Top Activities Fetched Successfully", result);
  } catch (error) {
    fatal(error);
    errorResponse(res, error.message);
  }
};

const getMonthlyActivityScore = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { year, month } = req.params;
    const result = await activityService.getMonthlyActivityScore(
      userId,
      year,
      month
    );
    successResponse(res, "Monthly Activity Score Fetched Successfully", result);
  } catch (error) {
    fatal(error);
    errorResponse(res, error.message);
  }
};

const getActivityCountsPerDay = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { year, month } = req.params;
    const result = await activityService.getActivityCountsPerDay(
      userId,
      year,
      month
    );
    successResponse(res, "Activity Count for Day Fetched Successfully", result);
  } catch (error) {
    fatal(error);
    errorResponse(res, error.message);
  }
};

const getActivitySuggestions = async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await activityService.getActivitySuggestions(userId);
    successResponse(res, "Activity Suggestions Fetched Successfully", result);
  } catch (error) {
    fatal(error);
    errorResponse(res, error.message);
  }
};

const getActivitiesInRange = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate, activityType } = req.query;
    const minDuration = parseFloat(req.query.minDuration);
    const maxDuration = parseFloat(req.query.maxDuration);
    const result = await activityService.getActivitiesInRange(
      userId,
      startDate,
      endDate,
      activityType,
      minDuration,
      maxDuration
    );
    successResponse(
      res,
      "Activities In Range Fetched Successfully",
      result.activities
    );
  } catch (error) {
    fatal(error);
    errorResponse(res, error.message);
  }
};

const getMonthlyActivityStats = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { year, month } = req.params;
    const result = await activityService.getMonthlyActivityStats(
      userId,
      year,
      month
    );
    successResponse(res, "Monthly Activity Stats Fetched Successfully", result);
  } catch (error) {
    fatal(error);
    errorResponse(res, error.message);
  }
};

const getActivityById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { activityId } = req.params;
    const result = await activityService.getActivityById(userId, activityId);
    successResponse(res, "Activity Fetched Successfully", result);
  } catch (error) {
    fatal(error);
    errorResponse(res, error.message);
  }
};

const createActivity = async (req, res) => {
  try {
    const userId = req.user.userId;
    const activitiesData = req.body;

    const result = await activityService.createActivity(userId, activitiesData);
    successResponse(
      res,
      res.message || "Activity Created Successfully",
      result.activities || result,
      201
    );
  } catch (error) {
    fatal(error);
    errorResponse(res, error.message);
  }
};

const getLastActivityHourForDay = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date } = req.params;
    const [year, month, day] = date.split("-").map(Number);

    const result = await activityService.getLastActivityHours(
      userId,
      year,
      month,
      day
    );
    info(result);
    successResponse(
      res,
      result.message || "Activity Data Fetched Successfully",
      result.hoursSinceLastActivity || result
    );
  } catch (error) {
    fatal(error);
    errorResponse(res, error.message);
  }
};

module.exports = {
  getDailyActivityScore,
  getTopActivitiesForDay,
  getMonthlyActivityScore,
  getActivityCountsPerDay,
  getActivitySuggestions,
  getActivitiesInRange,
  getMonthlyActivityStats,
  getActivityById,
  createActivity,
  getLastActivityHourForDay,
};
