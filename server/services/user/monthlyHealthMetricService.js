const monthlyHealthMetricRepository = require("./repositories/monthlyHealthMetricRepository");
const userRepository = require("./repositories/userRepository");
const { getCurrentIST } = require("../../common/utils/timezone");

const getHealthMetricForMonth = async (userId, year, month, showJson = false) => {
  // Validate user exists
  const user = await userRepository.findById(userId);
  if (!user) throw new Error("User not found");

  return await monthlyHealthMetricRepository.getMonthlyMetric(userId, year, month, showJson);
};

const updateHealthMetricForMonth = async (userId, year, month, updateData) => {
  // Validate user exists
  const user = await userRepository.findById(userId);
  if (!user) throw new Error("User not found");

  return await monthlyHealthMetricRepository.updateMonthlyMetric(
    userId,
    year,
    month,
    updateData
  );
};

const createHealthMetricForMonth = async (userId, year, month, metricData = {}) => {
  // Validate user exists
  const user = await userRepository.findById(userId);
  if (!user) throw new Error("User not found");

  return await monthlyHealthMetricRepository.createMonthlyMetric(
    userId,
    year,
    month,
    metricData
  );
};

// Helper function to get current month's metric
const getCurrentMonthHealthMetric = async (userId) => {
  const now = getCurrentIST();
  return await getHealthMetricForMonth(
    userId,
    now.getFullYear(),
    now.getMonth() + 1 // Months are 1-12
  );
};

module.exports = {
  getHealthMetricForMonth,
  updateHealthMetricForMonth,
  createHealthMetricForMonth,
  getCurrentMonthHealthMetric
};