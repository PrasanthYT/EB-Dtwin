const express = require('express');
const router = express.Router();
const connectController = require('../controllers/connect.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

// Fitbit OAuth routes
router.get('/fitbit/authorize', authMiddleware, connectController.initiateFitbitOAuth);
router.get('/fitbit/callback', connectController.fitbitOAuthCallback);

// Initial data sync routes
router.get('/fitbit/activity/initial', authMiddleware, connectController.saveInitialActivityData);
router.get('/fitbit/sleep/initial', authMiddleware, connectController.saveInitialSleepData);
router.get('/fitbit/steps/initial',       authMiddleware, connectController.saveInitialStepsData);
router.get('/fitbit/distance/initial',    authMiddleware, connectController.saveInitialDistanceData);
router.get('/fitbit/spo2/initial',        authMiddleware, connectController.saveInitialSPO2Data);
router.get('/fitbit/heart-rate/initial',  authMiddleware, connectController.saveInitialHeartRateData);
router.get('/fitbit/activity-summary/initial', authMiddleware, connectController.saveInitialActivitySummaryData);
router.get('/fitbit/skin-temperature/initial', authMiddleware, connectController.saveInitialSkinTemperatureData);
router.get('/fitbit/breathing-rate/initial',   authMiddleware, connectController.saveInitialBreathingRateData);
router.get('/fitbit/hrv/initial',               authMiddleware, connectController.saveInitialHrvData);
router.get('/fitbit/cardio-score/initial',      authMiddleware, connectController.saveInitialCardioScoreData);

// 2️⃣ Combined “monthly” endpoint—runs all of the above back‐to‐back:
router.get('/fitbit/monthly-sync', authMiddleware, connectController.syncMonthlyData);

// Daily sync routes
router.get('/fitbit/activity/sync', authMiddleware, connectController.syncDailyActivityData);
router.get('/fitbit/sleep/sync', authMiddleware, connectController.syncDailySleepData);
router.get('/fitbit/steps/sync', authMiddleware, connectController.syncDailyStepsData);
router.get('/fitbit/distance/sync', authMiddleware, connectController.syncDailyDistanceData);
router.get('/fitbit/spo2/sync', authMiddleware, connectController.syncDailySPO2Data);
router.get('/fitbit/heart-rate/sync', authMiddleware, connectController.syncDailyHeartRateData);
router.get("/fitbit/activity-summary/sync", authMiddleware, connectController.syncActivitySummary)
router.get("/fitbit/skin-temperature/sync", authMiddleware, connectController.syncSkinTemperature)
router.get("/fitbit/breathing-rate/sync", authMiddleware, connectController.syncBreathingRate)
router.get("/fitbit/hrv/sync", authMiddleware, connectController.syncHrvData)
router.get("/fitbit/cardio-score/sync", authMiddleware, connectController.syncCardioScore)

// Health Connect routes
router.post('/health-connect/activity', authMiddleware, connectController.saveHealthConnectActivityData);
router.post('/health-connect/sleep', authMiddleware, connectController.saveHealthConnectSleepData);

// Manual Entry routes
router.post('/manual-entry/activity', authMiddleware, connectController.saveManualActivityData);
router.post('/manual-entry/sleep', authMiddleware, connectController.saveManualSleepData);

module.exports = router;
