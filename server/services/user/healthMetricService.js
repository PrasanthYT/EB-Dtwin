const healthmetricRepository = require("./repositories/healthMetricRepository");
const userRepository = require("./repositories/userRepository");
const MonthlyHealthMetricService = require("./monthlyHealthMetricService");
const { logger, info, debug, errorLog, warn } = require('@dtwin/config');

const getHealthMetric = async (userId, date) => {
  const [year, month, day] = date.split("-").map(Number);

  if (!year || !month || !day) {
    throw new Error("Invalid date format. Please use 'YYYY-MM-DD'.");
  }

  return await healthmetricRepository.getOrCreateHealthMetricFromDate(
    userId,
    year,
    month,
    day
  );
};

const getHealthMetricByDayId = async (userId, dayId) => {
  // Validate user exists
  const user = await userRepository.findById(userId);
  if (!user) throw new Error("User not found");

  // Get healthmetric by dayId
  return await healthmetricRepository.getOrCreateHealthMetricFromDayID(
    userId,
    dayId
  );
};

const createHealthMetric = async (userId, date, healthmetricData = {}) => {
  // Validate user exists
  const user = await userRepository.findById(userId);
  if (!user) throw new Error("User not found");

  const [year, month, day] = date.split("-").map(Number);

  if (!year || !month || !day) {
    throw new Error("Invalid date format. Please use 'YYYY-MM-DD'.");
  }
  // Create healthmetric with userId
  return await healthmetricRepository.createHealthMetric({
    userId: userId,
    year,
    month,
    day,
    ...healthmetricData,
  });
};

const updateHealthMetricByDate = async (
  year,
  month,
  day,
  userId,
  updateData
) => {
  return await healthmetricRepository.updateHealthMetricByDate(
    year,
    month,
    day,
    userId,
    updateData
  );
};

const getMonthlyStepsData = async (userId, year, month) => {
  const monthlyHealthMetric =
    await MonthlyHealthMetricService.getHealthMetricForMonth(
      userId,
      year,
      month,
      true
    );
  const currentDate = new Date();
  const isCurrentMonth =
    Number(year) === currentDate.getFullYear() &&
    Number(month) === currentDate.getMonth() + 1;

  let needsRefresh = false;

  if (isCurrentMonth) needsRefresh = true;

  if (monthlyHealthMetric?.monthly_steps_data && !needsRefresh) {
    info("Returning cached monthly steps data");
    return monthlyHealthMetric.monthly_steps_data;
  }

  // Fetch fresh steps data from the repo
  const MonthlyData = await healthmetricRepository.fetchMonthlyHealthMetric(
    userId,
    year,
    month
  );

  const dailyData = await Promise.all(
    MonthlyData.map(async (entry) => {
      const dateInfo = await healthmetricRepository.getDateByDayId(entry.dayId);
      const formattedDate = dateInfo?.formattedDate || null;

      return {
        dayId: entry.dayId,
        date: formattedDate,
        total_steps: entry.total_steps,
        distance_covered: entry.distance_covered,
        created_at: entry.created_at,
      };
    })
  );

  // Summary statistics
  const summary = {
    totalDays: dailyData.length,
    totalSteps: dailyData.reduce((sum, d) => sum + (d.total_steps || 0), 0),
    averageSteps:
      dailyData.reduce((sum, d) => sum + (d.total_steps || 0), 0) /
      (dailyData.length || 1),
    totalDistance: dailyData.reduce(
      (sum, d) => sum + (d.distance_covered || 0),
      0
    ),
    averageDistance:
      dailyData.reduce((sum, d) => sum + (d.distance_covered || 0), 0) /
      (dailyData.length || 1),
  };

  const monthlyStepsData = {
    days: dailyData,
    summary,
    lastUpdated: new Date().toISOString(),
  };

  await MonthlyHealthMetricService.updateHealthMetricForMonth(
    userId,
    year,
    month,
    {
      monthly_steps_data: monthlyStepsData,
    }
  );

  return monthlyStepsData;
};

const getMonthlyWeightData = async (userId, year, month) => {
  const monthlyHealthMetric =
    await MonthlyHealthMetricService.getHealthMetricForMonth(
      userId,
      year,
      month,
      true
    );
  const currentDate = new Date();
  const isCurrentMonth =
    Number(year) === currentDate.getFullYear() &&
    Number(month) === currentDate.getMonth() + 1;

  let needsRefresh = false;

  if (isCurrentMonth) needsRefresh = true;

  if (monthlyHealthMetric?.monthly_weight_data && !needsRefresh) {
    info("Returning cached monthly weight data");
    return monthlyHealthMetric.monthly_steps_data;
  }

  const MonthlyData = await healthmetricRepository.fetchMonthlyHealthMetric(
    userId,
    year,
    month
  );

  const dailyData = await Promise.all(
    MonthlyData.map(async (entry) => {
      const dateInfo = await healthmetricRepository.getDateByDayId(entry.dayId);
      const formattedDate = dateInfo?.formattedDate || null;

      return {
        dayId: entry.dayId,
        date: formattedDate,
        weight: entry.weight,
        created_at: entry.created_at,
      };
    })
  );

  // Summary statistics
  const summary = {
    totalDays: dailyData.length,
    averageWeight:
      dailyData.reduce((sum, d) => sum + (d.weight || 0), 0) /
      (dailyData.length || 1),
    minWeight: Math.min(...dailyData.map((d) => d.weight || Infinity)),
    maxWeight: Math.max(...dailyData.map((d) => d.weight || -Infinity)),
  };

  const monthlyWeightData = {
    days: dailyData,
    summary,
    lastUpdated: new Date().toISOString(),
  };

  await MonthlyHealthMetricService.updateHealthMetricForMonth(
    userId,
    year,
    month,
    {
      monthly_weight_data: monthlyWeightData,
    }
  );

  return monthlyWeightData;
};

const getOrCreateHeartData = async (userId, date) => {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) throw new Error("Invalid date format");

  const user = await userRepository.findById(userId);
  if (!user) throw new Error("User not found");

  return await healthmetricRepository.getOrCreateHeartDataFromDate(
    userId,
    year,
    month,
    day
  );
};

const updateOrCreateHeartData = async (userId, date, updateData) => {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) throw new Error("Invalid date format");

  const user = await userRepository.findById(userId);
  if (!user) throw new Error("User not found");

  return await healthmetricRepository.updateOrCreateHeartDataFromDate(
    userId,
    year,
    month,
    day,
    updateData
  );
};

const getMonthlyHeartRateData = async (userId, year, month) => {
  const monthlyHealthMetric =
    await MonthlyHealthMetricService.getHealthMetricForMonth(
      userId,
      year,
      month,
      true
    );

  const currentDate = new Date();
  const isCurrentMonth =
    year === currentDate.getFullYear() && month === currentDate.getMonth() + 1;

  let needsRefresh = false;

  if (isCurrentMonth) {
    needsRefresh = true;
  } else if (monthlyHealthMetric?.monthly_heart_rate_data) {
    // Check if data is stale for past months
    const lastEntry = await healthmetricRepository.getLastHeartDataForMonth(
      userId,
      year,
      month
    );

    needsRefresh =
      lastEntry &&
      new Date(lastEntry.created_at) >
        new Date(monthlyHealthMetric.monthly_heart_rate_data.lastUpdated);
  }

  if (monthlyHealthMetric?.monthly_heart_rate_data && !needsRefresh) {
    info("Returning cached monthly heart rate data");
    return monthlyHealthMetric.monthly_heart_rate_data;
  }

  // Fetch fresh heart data from the repo
  const heartEntries = await healthmetricRepository.fetchMonthlyHeartData(
    userId,
    year,
    month
  );

  const dailyData = await Promise.all(
    heartEntries.map(async (entry) => {
      const dateInfo = await healthmetricRepository.getDateByDayId(entry.dayId);
      const formattedDate = dateInfo?.formattedDate || null;

      return {
        dayId: entry.dayId,
        date: formattedDate,
        resting_heart_rate: entry.resting_heart_rate,
        max_heart_rate: entry.max_heart_rate,
        min_heart_rate: entry.min_heart_rate,
        created_at: entry.created_at,
      };
    })
  );

  // Summary statistics
  const summary = {
    totalDays: dailyData.length,
    averageResting:
      dailyData.reduce((sum, d) => sum + (d.resting_heart_rate || 0), 0) /
      (dailyData.length || 1),
    averageMax:
      dailyData.reduce((sum, d) => sum + (d.max_heart_rate || 0), 0) /
      (dailyData.length || 1),
    averageMin:
      dailyData.reduce((sum, d) => sum + (d.min_heart_rate || 0), 0) /
      (dailyData.length || 1),
  };

  const monthlyHeartRateData = {
    days: dailyData,
    summary,
    lastUpdated: new Date().toISOString(),
  };

  await MonthlyHealthMetricService.updateHealthMetricForMonth(
    userId,
    year,
    month,
    {
      monthly_heart_rate_data: monthlyHeartRateData,
    }
  );

  return monthlyHeartRateData;
};

module.exports = {
  getHealthMetric,
  createHealthMetric,
  updateHealthMetricByDate,
  getHealthMetricByDayId,
  getMonthlyStepsData,
  getMonthlyWeightData,
  getOrCreateHeartData,
  updateOrCreateHeartData,
  getMonthlyHeartRateData,
};
