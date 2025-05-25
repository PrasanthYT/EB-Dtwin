const express = require("express");
const router = express.Router();
const foodController = require("../controllers/food.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");

// Endpoints
router.get("/daily/:date", authMiddleware, foodController.getDailyFoodData);
router.get(
  "/monthly/:year/:month",
  authMiddleware,
  foodController.getMonthlyFoodData
);
router.get("/range", authMiddleware, foodController.getFoodDataInRange);
router.post("/", authMiddleware, foodController.postFoodSession);
router.get(
  "/score/daily/:date",
  authMiddleware,
  foodController.getDailyFoodScore
);
router.get(
  "/score/metabolic/:date",
  authMiddleware,
  foodController.getMetabolicScore
);

router.post("/scan", authMiddleware, foodController.scanFood);

module.exports = router;
