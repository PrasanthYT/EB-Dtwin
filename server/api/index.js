const express = require("express");
const router = express.Router();

const userRoutes = require("./routes/user.routes");
const userProfileRoutes = require("./routes/userProfile.routes");
const sleepRoutes = require("./routes/sleep.routes");
const activityRoutes = require("./routes/activity.routes");
const healthMetricRoutes = require("./routes/healthMetric.routes");
const connectRoutes = require("./routes/connect.routes");
const foodRoutes = require("./routes/food.routes");
const medicationRoutes = require("./routes/medication.routes");
const notificationRoutes = require("./routes/notification.routes");
const dietPlanRoutes = require("./routes/dietPlan.routes");
const exercisePlanRoutes = require("./routes/exercisePlan.routes");
const diseasePredictionRoutes = require("./routes/diseasePrediction.routes");

router.use("/users", userRoutes);
router.use("/profiles", userProfileRoutes);
router.use("/sleep", sleepRoutes);
router.use("/food", foodRoutes);
router.use("/activity", activityRoutes);
router.use("/health-metrics", healthMetricRoutes);
router.use("/connect", connectRoutes);
router.use("/medication", medicationRoutes);
router.use("/notifications", notificationRoutes);
router.use("/diet-plan", dietPlanRoutes);
router.use("/exercise-plan", exercisePlanRoutes);
router.use("/disease", diseasePredictionRoutes);

module.exports = router;
