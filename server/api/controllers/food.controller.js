const foodService = require("../../services/food/foodService");
const {
  info,
  fatal,
  successResponse,
  errorResponse,
} = require("@dtwin/config");

const getDailyFoodData = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date } = req.params;
    const result = await foodService.getDailyFoodData(userId, date);
    successResponse(res, result.message || "Fetched successfully", result);
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

const getMonthlyFoodData = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { year, month } = req.params;
    const result = await foodService.getMonthlyFoodData(userId, year, month);
    successResponse(
      res,
      result.message || "Monthly food data fetched successfully",
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

const getFoodDataInRange = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate, mealType, minCalories, maxCalories } =
      req.query;

    // Validate required parameters
    if (!startDate || !endDate) {
      return errorResponse(
        res,
        `Both startDate and endDate are required${req.query}`,
        null,
        400
      );
    }

    // Prepare filters
    const filters = {};
    if (mealType) filters.mealType = mealType;
    if (minCalories) filters.minCalories = parseFloat(minCalories);
    if (maxCalories) filters.maxCalories = parseFloat(maxCalories);

    // Get data from service
    const result = await foodService.getFoodDataRange(
      userId,
      startDate,
      endDate,
      filters
    );

    // Handle service response
    if (!result.success) {
      return errorResponse(
        res,
        result.message || "Failed to fetch food data",
        result.error,
        result.statusCode || 500
      );
    }

    return successResponse(
      res,
      result.message || "Food data fetched successfully",
      result
    );
  } catch (error) {
    fatal(error);
    return errorResponse(
      res,
      error.message || "An unexpected error occurred",
      process.env.NODE_ENV === "development" ? error.stack : null,
      error.statusCode || 500
    );
  }
};

const postFoodSession = async (req, res) => {
  try {
    const userId = req.user.userId;
    const sessionData = req.body;

    // Validate required fields
    if (!sessionData.date || !sessionData.foodItems) {
      return errorResponse(
        res,
        "Missing required fields: date and foodItems",
        null,
        400
      );
    }

    const result = await foodService.postFoodSession(userId, sessionData);
    successResponse(res, "Food session processed successfully", result);
  } catch (error) {
    errorResponse(
      res,
      error.message || "Failed to process food session",
      null,
      error.statusCode || 500
    );
  }
};

const getDailyFoodScore = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date } = req.params;
    const result = await foodService.getDailyFoodScore(userId, date);
    successResponse(
      res,
      result.message || "Daily food score fetched successfully",
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

const getMonthlyFoodScore = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { year, month } = req.params;
    const result = await foodService.getMonthlyFoodScore(userId, year, month);
    successResponse(
      res,
      result.message || "Monthly food score fetched successfully",
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

const getMetabolicScore = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date } = req.params;
    const result = await foodService.getMetabolicScore(userId, date);
    successResponse(
      res,
      result.message || "Metabolic score fetched successfully",
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
  getDailyFoodData,
  getMonthlyFoodData,
  getFoodDataInRange,
  postFoodSession,
  getDailyFoodScore,
  getMonthlyFoodScore,
  getMetabolicScore,
};
