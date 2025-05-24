const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");

router.get("/connection-status",authMiddleware, notificationController.checkUserConnection);
router.post("/token", authMiddleware, notificationController.updatePushToken);
router.post("/test", authMiddleware, notificationController.sendTestNotification);
router.post("/test-socket",authMiddleware, notificationController.sendTestSocketNotification);

module.exports = router; 