const express = require("express");
const router = express.Router();
const userProfileController = require("../controllers/userProfile.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");

// Get current user's profile
router.get("/", authMiddleware, userProfileController.getProfile);

// Update profile
router.patch("/", authMiddleware, userProfileController.updateProfile);

//get health score
router.get(
  "/health-score",
  authMiddleware,
  userProfileController.getHealthScore
);

// Get daily leaderboard
router.get(
  "/leaderboard/daily",
  authMiddleware,
  userProfileController.getDailyLeaderboard
);

// Get monthly leaderboard
router.get(
  "/leaderboard/monthly",
  authMiddleware,
  userProfileController.getMonthlyLeaderboard
);

module.exports = router;