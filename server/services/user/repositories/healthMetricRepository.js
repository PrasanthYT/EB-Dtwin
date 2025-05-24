const { Op, Sequelize } = require("sequelize");
const {
  HealthMetrics,
  Day,
  Month,
  Year,
  HeartData,
  User,
} = require("@dtwin/shared-database");

const getOrCreateDayId = async (year, month, day) => {
  const foundDay = await Day.findOne({
    where: { day },
    include: {
      model: Month,
      include: {
        model: Year,
        where: { year },
      },
      where: { month },
    },
  });

  if (foundDay) return foundDay.id;

  // If not found, create year → month → day chain
  const [yearRecord] = await Year.findOrCreate({ where: { year } });
  const [monthRecord] = await Month.findOrCreate({
    where: { month, yearId: yearRecord.id },
  });
  const newDay = await Day.create({ day, monthId: monthRecord.id });
  return newDay.id;
};

const createHealthMetric = async (
  userId,
  year,
  month,
  day,
  healthmetricData = {}
) => {
  // First check if user exists
  const userExists = await User.findByPk(userId);
  if (!userExists) {
    throw new Error(`User with ID ${userId} does not exist`);
  }

  // Get or create the dayId
  const dayId = await getOrCreateDayId(year, month, day);

  // Create healthmetric with userId
  return await HealthMetrics.create({
    userId,
    ...healthmetricData,
    dayId,
  });
};

const getOrCreateHealthMetricFromDayID = async (userId, dayId) => {
  // First check if user exists
  const userExists = await User.findByPk(userId);
  if (!userExists) {
    throw new Error(`User with ID ${userId} does not exist`);
  }

  const res = await HealthMetrics.findOne({ where: { userId, dayId } });

  if (res) return res;

  const healthmetric = await HealthMetrics.create({
    userId,
    dayId,
  });

  return healthmetric;
};

const getOrCreateHealthMetricFromDate = async (userId, year, month, day) => {
  // First check if user exists
  const userExists = await User.findByPk(userId);
  if (!userExists) {
    throw new Error(`User with ID ${userId} does not exist`);
  }

  const dayId = await getOrCreateDayId(year, month, day);
  const res = await HealthMetrics.findOne({ where: { userId, dayId } });

  if (res) return res;

  const healthmetric = await HealthMetrics.create({
    userId,
    dayId,
  });

  return healthmetric;
};

const updateHealthMetricByDate = async (
  year,
  month,
  day,
  userId,
  updateData
) => {
  const healthmetric = await getOrCreateHealthMetricFromDate(
    userId,
    year,
    month,
    day
  );
  if (!healthmetric) throw new Error("Health metric not found");
  return await healthmetric.update(updateData);
};

const fetchMonthlyHealthMetric = async (userId, year, month) => {
  const yearRecord = await Year.findOne({ where: { year } });
  if (!yearRecord) return [];

  const monthRecord = await Month.findOne({
    where: { month, yearId: yearRecord.id },
  });
  if (!monthRecord) return [];

  const days = await Day.findAll({
    where: { monthId: monthRecord.id },
    attributes: ["id"],
  });

  const dayIds = days.map((day) => day.id);

  return await HealthMetrics.findAll({
    where: {
      userId,
      dayId: { [Op.in]: dayIds },
    },
  });
};

const getOrCreateHeartDataFromDate = async (userId, year, month, day) => {
  // First check if user exists
  const userExists = await User.findByPk(userId);
  if (!userExists) {
    throw new Error(`User with ID ${userId} does not exist`);
  }

  const dayId = await getOrCreateDayId(year, month, day);
  let heartData = await HeartData.findOne({ where: { userId, dayId } });

  if (!heartData) {
    heartData = await HeartData.create({
      userId,
      dayId,
    });
  }

  return heartData;
};

const updateOrCreateHeartDataFromDate = async (
  userId,
  year,
  month,
  day,
  updateData
) => {
  const heartData = await getOrCreateHeartDataFromDate(
    userId,
    year,
    month,
    day
  );

  // Handle heart_rate_data merging
  if (updateData.heart_rate_data) {
    const existingData = heartData.heart_rate_data || [];

    const existingTimes = new Set(existingData.map((d) => d.time));

    // Filter only new entries based on time
    const newData = updateData.heart_rate_data.filter(
      (d) => !existingTimes.has(d.time)
    );

    // Merge existing + new entries
    updateData.heart_rate_data = [...existingData, ...newData];
  }

  return await heartData.update(updateData);
};

const fetchMonthlyHeartData = async (userId, year, month) => {
  const yearRecord = await Year.findOne({ where: { year } });
  if (!yearRecord) return [];

  const monthRecord = await Month.findOne({
    where: { month, yearId: yearRecord.id },
  });
  if (!monthRecord) return [];

  const days = await Day.findAll({
    where: { monthId: monthRecord.id },
    attributes: ["id"],
  });

  const dayIds = days.map((day) => day.id);

  return await HeartData.findAll({
    where: {
      userId,
      dayId: { [Op.in]: dayIds },
    },
  });
};

const getLastHeartDataForMonth = async (userId, year, month) => {
  return await HeartData.findOne({
    where: {
      userId,
      [Op.and]: [
        Sequelize.where(
          Sequelize.fn("date_part", "year", Sequelize.col("createdAt")),
          year
        ),
        Sequelize.where(
          Sequelize.fn("date_part", "month", Sequelize.col("createdAt")),
          month
        ),
      ],
    },
    order: [["createdAt", "DESC"]],
    limit: 1,
  });
};

const getDateByDayId = async (dayId) => {
  const dayRecord = await Day.findByPk(dayId, {
    include: {
      model: Month,
      include: {
        model: Year,
      },
    },
  });

  if (!dayRecord) return null;

  return {
    year: dayRecord.Month.Year.year,
    month: dayRecord.Month.month,
    day: dayRecord.day,
    formattedDate: `${dayRecord.Month.Year.year}-${String(
      dayRecord.Month.month
    ).padStart(2, "0")}-${String(dayRecord.day).padStart(2, "0")}`,
  };
};

// New function to get all users' leaderboard scores for a specific day
const getDailyLeaderboardScores = async (year, month, day) => {
  const dayId = await getOrCreateDayId(year, month, day);
  
  // Find all health metrics for the specified day that have a leaderboard score
  const healthMetrics = await HealthMetrics.findAll({
    where: {
      dayId,
      leaderboard_score: {
        [Op.not]: null
      }
    },
    attributes: [
      'userId',
      'leaderboard_score'
    ]
  });
  
  // Return the metrics without attempting to join User model
  return healthMetrics.map(metric => ({
    userId: metric.userId,
    username: `User ${metric.userId.substr(0, 8)}`, // Use userId substring as fallback
    leaderboard_score: metric.leaderboard_score
  }));
};

module.exports = {
  createHealthMetric,
  getOrCreateHealthMetricFromDate,
  getOrCreateHealthMetricFromDayID,
  updateHealthMetricByDate,
  fetchMonthlyHealthMetric,
  getOrCreateHeartDataFromDate,
  updateOrCreateHeartDataFromDate,
  fetchMonthlyHeartData,
  getLastHeartDataForMonth,
  getDateByDayId,
  getDailyLeaderboardScores
};