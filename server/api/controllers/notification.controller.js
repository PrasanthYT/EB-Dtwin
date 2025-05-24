const {
  updatePushToken,
  sendPushNotification,
} = require("../../services/notification/services/pushService");
const {
  isUserConnected,
  sendSocketNotification,
} = require("../../services/notification/services/socketService");
const { info, errorLog } = require("@dtwin/config");

const checkUserConnection = async (req, res) => {
  try {
    // Get authenticated user ID from the request
    const userId = req.user.userId;

    // Check if user has active WebSocket connections
    const connected = await isUserConnected(userId);

    // Return connection status to client
    res.status(200).json({
      success: true,
      isConnected: connected,
    });
  } catch (err) {
    errorLog("Error checking user connection:", err);
    res.status(500).json({
      success: false,
      message: "Failed to check user connection",
      error: err.message,
    });
  }
};

const updatePushTokenHandler = async (req, res) => {
  try {
    // Get authenticated user ID from the request
    const userId = req.user.userId;

    // Get FCM token from request body
    const { token } = req.body;

    // Validate token presence
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Push token is required",
      });
    }

    // Update token in the database
    const result = await updatePushToken(userId, token);

    // If token update failed, return error
    if (!result) {
      return res.status(400).json({
        success: false,
        message: "Failed to update push token",
      });
    }

    // Return success response
    res.status(200).json({
      success: true,
      message: "Push notification token updated",
    });
  } catch (err) {
    errorLog("Error updating push token:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update push token",
      error: err.message,
    });
  }
};

const sendTestNotification = async (req, res) => {
  try {
    // Get user ID from the request body or use the hardcoded ID
    // In a real implementation, this should come from req.user.userId after authentication
    const userId = req.user.userId;

    info(`Preparing to send test notification to user ${userId}`);

    // Get notification details from request or use defaults
    const title = req.body.title || "Test Notification";
    const message =
      req.body.message || "This is a test notification from Di-Twin";
    const type = req.body.type || "test";

    // Combine data from request with timestamp
    const data = {
      ...(req.body.data || {}),
      timestamp: new Date().toISOString(),
      source: "test-endpoint",
    };

    info(
      `Notification payload: ${JSON.stringify({ title, message, type, data })}`
    );

    // Send a test push notification via FCM
    const result = await sendPushNotification(userId, {
      title,
      message,
      type,
      data,
    });

    // Log the detailed result for debugging
    console.log("Push notification result:", JSON.stringify(result, null, 2));

    // If notification sending failed, return error with reason
    if (!result.success) {
      errorLog(
        `Failed to send notification to user ${userId}: ${
          result.reason || result.error
        }`
      );
      return res.status(400).json({
        success: false,
        message: "Failed to send test notification",
        reason: result.reason || result.error,
        details: result,
      });
    }

    // Return success response with detailed result
    info(`Successfully sent test notification to user ${userId}`);
    res.status(200).json({
      success: true,
      message: "Test notification sent successfully",
      result,
    });
  } catch (err) {
    errorLog("Error sending test notification:", err);
    res.status(500).json({
      success: false,
      message: "Failed to send test notification",
      error: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
};

const sendTestSocketNotification = async (req, res) => {
  try {
    // Get user ID from the request body or use the hardcoded ID
    const userId = req.user.userId;

    info(`Preparing to send test socket notification to user ${userId}`);

    // Check if user is connected via WebSocket
    const isConnected = await isUserConnected(userId);

    if (!isConnected) {
      return res.status(400).json({
        success: false,
        message: "User is not connected via WebSocket",
        reason: "user-not-connected",
      });
    }

    // Get notification details from request or use defaults
    const title = req.body.title || "Test Socket Notification";
    const message =
      req.body.message || "This is a test socket notification from Di-Twin";
    const type = req.body.type || "socket-test";

    // Combine data from request with timestamp
    const data = {
      ...(req.body.data || {}),
      timestamp: new Date().toISOString(),
      source: "socket-test-endpoint",
    };

    info(
      `Socket notification payload: ${JSON.stringify({
        title,
        message,
        type,
        data,
      })}`
    );

    // Try multiple ways to get the Socket.io instance
    let io = global.io; // Try the global variable
    if (!io && req.app) io = req.app.get("io"); // Try from Express app

    if (!io) {
      errorLog(
        'Socket.io instance not available via either global.io or req.app.get("io")'
      );
      return res.status(500).json({
        success: false,
        message: "Socket.io server not available",
        reason: "socket-io-unavailable",
      });
    }

    // Send the socket notification
    const result = await sendSocketNotification(io, userId, {
      title,
      message,
      type,
      data,
    });

    // If sending failed, return error
    if (!result) {
      errorLog(`Failed to send socket notification to user ${userId}`);
      return res.status(400).json({
        success: false,
        message: "Failed to send test socket notification",
      });
    }

    // Return success response
    info(`Successfully sent test socket notification to user ${userId}`);
    res.status(200).json({
      success: true,
      message: "Test socket notification sent successfully",
    });
  } catch (err) {
    errorLog("Error sending test socket notification:", err);
    res.status(500).json({
      success: false,
      message: "Failed to send test socket notification",
      error: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
};

module.exports = {
  updatePushToken: updatePushTokenHandler,
  checkUserConnection,
  sendTestNotification,
  sendTestSocketNotification,
};
