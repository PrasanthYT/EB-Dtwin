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
app.use(cors());
info(test()); // Test the ML-Score function
app.use("/api", routes);
app.get("/", (req, res) => {
  res.status(200).send({ message: "Test endpoint is working!" });
});
(async () => {
  await connectPostgres(); // Logs "✅ PostgreSQL connected"
  require("@dtwin/shared-database"); // Import models and sync them

  // Initialize notification service
  try {
    await initNotificationService(app, io);
    info("✅ Notification service initialized");
  } catch (notificationError) {
    errorLog(
      "❌ Failed to initialize notification service:",
      notificationError
    );
  }
  
  info("Fitbit sync worker initialized with the following schedule:");
  info("- Sleep data: Twice daily at 6:00 AM and 6:00 PM");
  info("- Activity data: Every 3 hours (6 AM, 9 AM, 12 PM, 3 PM, 6 PM, 9 PM, 12 AM, 3 AM)");
  info("- Steps data: Every 3 hours during day (6 AM, 9 AM, 12 PM, 3 PM, 6 PM, 9 PM)");
  info("- Distance data: Three times daily (6 AM, 12 PM, 6 PM)");

  await syncDatabase();
  try {
     // Initialize daily sliding-window scheduler
    initDailySlidingWindowScheduler();

    // Run startup integrity checker once
    await runStartupIntegrityChecker();
    const tables = await sequelize.getQueryInterface().showAllTables();
    if (tables.length === 0) {
      info("-> No tables found in the database.");
    } else {
      info(`-> Found ${tables.length} tables in the database:`);
      tables.forEach((table, index) => {
        info(`   ${index + 1}. ${table}`);
      });
    }
    console.log(`✅ Connected to database: "${sequelize.config.database}"`);

    // Check if tables have data
    for (const table of tables) {
      const count = await sequelize.query(`SELECT COUNT(*) AS count FROM "${table}"`, {
        type: sequelize.QueryTypes.SELECT,
      });
      const rowCount = count[0].count;
      if (rowCount > 0) {
        console.log(`📊 Table "${table}" contains ${rowCount} rows.`);
      } else {
        console.log(`📉 Table "${table}" is empty.`);
      }
    }
  } catch (err) {
    errorLog("❌ Error fetching tables or database info:", err);
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
