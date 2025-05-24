// dietPlan.routes.js
const express = require("express");
const router = express.Router();
const dietPlanController = require("../controllers/dietPlan.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");

// Get diet plan for a specific date (or today if not specified)
router.get("/", authMiddleware, dietPlanController.getDietPlan);

// Regenerate a specific meal for a specific date
router.post(
  "/regenerate/:mealType",
  authMiddleware,
  dietPlanController.regenerateMeal
);

// Update diet preferences
router.patch(
  "/preferences",
  authMiddleware,
  dietPlanController.updatePreferences
);

module.exports = router;
