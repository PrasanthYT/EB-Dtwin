// exercisePlan.routes.js
const express = require("express");
const router = express.Router();
const exercisePlanController = require("../controllers/exercisePlan.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");

// Get exercise plan for a specific date (or today if not specified)
router.get("/", authMiddleware, exercisePlanController.getExercisePlan);

// Regenerate a workout for a specific date
router.post(
  "/regenerate",
  authMiddleware,
  exercisePlanController.regenerateWorkout
);

// Update exercise preferences
router.patch(
  "/preferences",
  authMiddleware,
  exercisePlanController.updatePreferences
);

module.exports = router;
