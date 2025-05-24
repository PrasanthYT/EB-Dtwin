const express = require("express");
const router = express.Router();
const healthMetricController = require("../controllers/healthMetric.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");

// Get health metric by date
router.get("/", authMiddleware, healthMetricController.getHealthMetric);

// Update health metric table
router.patch("/", authMiddleware, healthMetricController.updateHealthMetric);

// Get heart data by date
router.get("/heart", authMiddleware, healthMetricController.getHeartData);

// Update heart data table
router.patch("/heart", authMiddleware, healthMetricController.updateHeartData);

// Get monthly heart rate data
router.get(
  "/heart/:year/:month",
  authMiddleware,
  healthMetricController.getMonthlyHeartRateData
);

// get monthly steps data
router.get(
  "/steps/:year/:month",
  authMiddleware,
  healthMetricController.getMonthlyStepsData
);

// get monthly weight data
router.get(
  "/weight/:year/:month",
  authMiddleware,
  healthMetricController.getMonthlyWeightData
);

//get all scores by date
router.get("/scores", authMiddleware, healthMetricController.getAllScores);

module.exports = router;
