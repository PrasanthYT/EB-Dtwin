const express = require("express");
const router = express.Router();
const activityController = require("../controllers/activity.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");

router.get(
  "/daily-score/:date",
  authMiddleware,
  activityController.getDailyActivityScore
);
router.get(
  "/top-activities/:date",
  authMiddleware,
  activityController.getTopActivitiesForDay
);
router.get(
  "/monthly-score/:year/:month",
  authMiddleware,
  activityController.getMonthlyActivityScore
);
router.get(
  "/monthly-activity-count/:year/:month",
  authMiddleware,
  activityController.getActivityCountsPerDay
);
router.get(
  "/activity-suggestions",
  authMiddleware,
  activityController.getActivitySuggestions
);
router.get(
  "/activity-range",
  authMiddleware,
  activityController.getActivitiesInRange
);
router.get(
  "/monthly-stats/:year/:month",
  authMiddleware,
  activityController.getMonthlyActivityStats
);
router.get("/:activityId", authMiddleware, activityController.getActivityById);
router.get(
  "/list-activities/:date",
  authMiddleware,
  activityController.getTopActivitiesForDay
);
router.get(
  "/lastActivity/:date",
  authMiddleware,
  activityController.getLastActivityHourForDay
);
router.post("/", authMiddleware, activityController.createActivity);

module.exports = router;
