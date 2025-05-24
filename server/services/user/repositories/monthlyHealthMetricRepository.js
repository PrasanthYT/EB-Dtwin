const { Op } = require("sequelize");
const { MonthlyHealthMetrics, Month, Year, User } = require("@dtwin/shared-database");

const getOrCreateMonthlyMetric = async (userId, year, month) => {
  // First check if user exists
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error(`User with ID ${userId} does not exist`);
  }

  // First find the month record
  const yearRecord = await Year.findOne({ where: { year } });
  if (!yearRecord) throw new Error("Year not found");

  const monthRecord = await Month.findOne({
    where: {
      month,
      yearId: yearRecord.id,
    },
  });
  if (!monthRecord) throw new Error("Month not found");

  // Find or create the monthly metric
  const [metric, created] = await MonthlyHealthMetrics.findOrCreate({
    where: {
      userId,
      monthId: monthRecord.id,
    },
    defaults: {
      userId,
      monthId: monthRecord.id,
    },
  });

  return metric;
};

const updateMonthlyMetric = async (userId, year, month, updateData) => {
  const metric = await getOrCreateMonthlyMetric(userId, year, month);
  return await metric.update(updateData);
};

const getMonthlyMetric = async (userId, year, month, showJson) => {
  const yearRecord = await Year.findOne({ where: { year } });
  if (!yearRecord) return null;

  const monthRecord = await Month.findOne({
    where: {
      month,
      yearId: yearRecord.id,
    },
  });
  if (!monthRecord) return null;

  const attributes = [
    "id",
    "userId",
    "monthId",
    "monthly_health_score",
    "monthly_sleep_score",
    "monthly_activity_score",
    "monthly_food_score",
    "monthly_leaderboard_score",
    // ... other scalar fields
  ];

  if (showJson) {
    attributes.push("monthly_sleep_data");
    attributes.push("monthly_activity_data");
    attributes.push("monthly_food_intake_data");
    attributes.push("monthly_heart_rate_data");
    attributes.push("monthly_steps_data");
  }

  return await MonthlyHealthMetrics.findOne({
    where: {
      userId,
      monthId: monthRecord.id,
    },
    attributes,
  });
};

const createMonthlyMetric = async (userId, year, month, metricData = {}) => {
  const yearRecord = await Year.findOne({ where: { year } });
  if (!yearRecord) throw new Error("Year not found");

  const monthRecord = await Month.findOne({
    where: {
      month,
      yearId: yearRecord.id,
    },
  });
  if (!monthRecord) throw new Error("Month not found");

  return await MonthlyHealthMetrics.create({
    userId,
    monthId: monthRecord.id,
    ...metricData,
  });
};

// Get all users' monthly leaderboard scores
const getMonthlyLeaderboardScores = async (year, month) => {
  const yearRecord = await Year.findOne({ where: { year } });
  if (!yearRecord) return [];

  const monthRecord = await Month.findOne({
    where: {
      month,
      yearId: yearRecord.id,
    },
  });
  if (!monthRecord) return [];

  // Find all monthly metrics with a leaderboard score
  const metrics = await MonthlyHealthMetrics.findAll({
    where: {
      monthId: monthRecord.id,
      monthly_leaderboard_score: {
        [Op.not]: null
      }
    },
    attributes: [
      'userId',
      'monthly_leaderboard_score'
    ]
  });

  // Format the response without user joins
  return metrics.map(metric => ({
    userId: metric.userId,
    username: `User ${metric.userId.substr(0, 8)}`, // Use userId substring as fallback username
    monthly_leaderboard_score: metric.monthly_leaderboard_score
  }));
};

module.exports = {
  getOrCreateMonthlyMetric,
  updateMonthlyMetric,
  getMonthlyMetric,
  createMonthlyMetric,
  getMonthlyLeaderboardScores
};