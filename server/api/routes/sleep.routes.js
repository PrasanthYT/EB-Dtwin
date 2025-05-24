const express = require("express");
const router = express.Router();
const sleepController = require("../controllers/sleep.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");

// Endpoints
router.get("/daily/:date", authMiddleware, sleepController.getDailySleepData);
router.get(
  "/monthly/:year/:month",
  authMiddleware,
  sleepController.getMonthlySleepData
);
router.get("/range", authMiddleware, sleepController.getSleepDataInRange);
router.get("/best-stage", authMiddleware, sleepController.getBestSleepStage);
router.post("/", authMiddleware, sleepController.postSleepSession);
router.get(
  "/score/daily/:date",
  authMiddleware,
  sleepController.getDailySleepScore
);
router.get(
  "/score/monthly/:year/:month",
  authMiddleware,
  sleepController.getMonthlySleepScore
);
router.get(
  "/recommendations/:date",
  authMiddleware,
  sleepController.getSleepRecommendations
);

module.exports = router;
