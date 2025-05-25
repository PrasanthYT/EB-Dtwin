require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const { info, errorLog } = require("@dtwin/config");
const routes = require("./api/index");
const {
  connectPostgres,
  syncDatabase,
  sequelize,
} = require("@dtwin/shared-database");
const { test } = require("@dtwin/ml-score-function");
const fitbitSyncWorker = require("./workers/fitbitSyncWorker");
const { initNotificationService } = require("./services/notification");
const {
  initDailySlidingWindowScheduler,
  runStartupIntegrityChecker,
} = require("./workers/RecommendationEngineWorker");
const { credential } = require("firebase-admin");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
    methods: ["GET", "POST"],
  },
});

app.use(express.json({ 
  limit: '50mb' // Increase from default 1mb to 50mb
}));

app.use(express.urlencoded({ 
  limit: '50mb',
  extended: true 
}));

// Make io instance available globally so controllers can access it
global.io = io;

// Store io in the Express app as well for middleware/routes that prefer this approach
app.set("io", io);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(helmet());
app.use(
  cors({
    origin: "*", // ✅ wildcard allowed when credentials are NOT used
    credentials: false, // or just remove this line entirely
  })
);
app.use("/api", routes);
app.get("/", (req, res) => {
  res.status(200).send({ message: "Test endpoint is working!" });
});
(async () => {
  await connectPostgres(); // Logs "✅ PostgreSQL connected"
  require("@dtwin/shared-database"); // Import models and sync them

  // Initialize notification service
  try {
    // await initNotificationService(app, io);
    info("✅ Notification service initialized");
  } catch (notificationError) {
    errorLog(
      "❌ Failed to initialize notification service:",
      notificationError
    );
  }

  await syncDatabase();
  const tables = await sequelize.getQueryInterface().showAllTables();
  console.info("🧾 Existing tables in DB:", tables);
  console.info("Connected to DB:", sequelize.config.database);

  // Initialize schedulers after database is connected
  try {
    // Initialize daily sliding-window scheduler

    initDailySlidingWindowScheduler();

    // Run startup integrity checker once
    await runStartupIntegrityChecker();

    info("Fitbit sync worker initialized with the following schedule:");
    info("- Sleep data: Twice daily at 6:00 AM and 6:00 PM");
    info(
      "- Activity data: Every 3 hours (6 AM, 9 AM, 12 PM, 3 PM, 6 PM, 9 PM, 12 AM, 3 AM)"
    );
    info(
      "- Steps data: Every 3 hours during day (6 AM, 9 AM, 12 PM, 3 PM, 6 PM, 9 PM)"
    );
    info("- Distance data: Three times daily (6 AM, 12 PM, 6 PM)");
    info("- Daily summary: Every 24 hours at 12 AM");
    info(
      "- Heart rate data: Every 6 hours during day (6 AM, 12 PM, 6 PM, 12 AM)"
    );
    console.info("✅ Schedulers initialized successfully");
  } catch (schedulerError) {
    errorLog("❌ Failed to initialize schedulers:", schedulerError);
  }
})();

// Socket.io connection handling
io.on("connection", (socket) => {
  info(`Socket connected: ${socket.id}`);

  socket.on("disconnect", () => {
    info(`Socket disconnected: ${socket.id}`);
  });
});

// Server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  info(`Server running on port ${PORT}`);
});
