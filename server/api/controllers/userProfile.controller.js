const { userProfileService } = require("../../services/user/index");
const {
  info,
  fatal,
  successResponse,
  errorResponse,
} = require("@dtwin/config");

const getProfile = async (req, res) => {
  try {
    const profile = await userProfileService.getProfile(req.user.userId);

    if (!profile)
      return errorResponse(res, "User is already deleted", null, 404);
    successResponse(res, "Profile fetched successfully", profile);
  } catch (error) {
    fatal(error);
    errorResponse(res, error);
  }
};

const updateProfile = async (req, res) => {
  try {
    const updatedProfile = await userProfileService.updateProfile(
      req.user.userId,
      req.body
    );

    successResponse(res, "Profile updated successfully", updatedProfile);
  } catch (error) {
    fatal(error);
    errorResponse(res, error.message || "Profile update failed", error);
  }
};

const getHealthScore = async (req, res) => {
  try {
    const healthScore = await userProfileService.getHealthScore(
      req.user.userId
    );
    successResponse(res, "Health score fetched successfully", healthScore);
  } catch (error) {
    fatal(error);
    errorResponse(res, error);
  }
};

const getDailyLeaderboard = async (req, res) => {
  try {
    const { date } = req.query; // Expected format: YYYY-MM-DD
    
    if (!date) {
      return errorResponse(res, "Date parameter is required (format: YYYY-MM-DD)", null, 400);
    }
    
    try {
      const leaderboard = await userProfileService.getDailyLeaderboard(
        req.user.userId,
        date
      );
      
      if (leaderboard === "NO_RANK") {
        return successResponse(res, "No rank found for this date", { message: "No rank found" });
      }
      
      successResponse(res, "Daily leaderboard fetched successfully", leaderboard);
    } catch (error) {
      if (error.message && error.message.includes('does not exist')) {
        return errorResponse(res, "User account not found", { message: "User account not found" }, 404);
      } else {
        throw error; // Re-throw for the outer catch block to handle
      }
    }
  } catch (error) {
    fatal(error);
    errorResponse(res, error.message || "Failed to fetch daily leaderboard", error);
  }
};

const getMonthlyLeaderboard = async (req, res) => {
  try {
    const { year, month } = req.query; // Expected: year=2025&month=5
    
    if (!year || !month) {
      return errorResponse(res, "Year and month parameters are required", null, 400);
    }
    
    try {
      const leaderboard = await userProfileService.getMonthlyLeaderboard(
        req.user.userId,
        parseInt(year),
        parseInt(month)
      );
      
      if (leaderboard === "NO_RANK") {
        return successResponse(res, "No rank found for this month", { message: "No rank found" });
      }
      
      successResponse(res, "Monthly leaderboard fetched successfully", leaderboard);
    } catch (error) {
      if (error.message && error.message.includes('does not exist')) {
        return errorResponse(res, "User account not found", { message: "User account not found" }, 404);
      } else {
        throw error; // Re-throw for the outer catch block to handle
      }
    }
  } catch (error) {
    fatal(error);
    errorResponse(res, error.message || "Failed to fetch monthly leaderboard", error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getHealthScore,
  getDailyLeaderboard,
  getMonthlyLeaderboard,
};