const { subDays, format } = require("date-fns");
const {
  calculateSleepScoreForWatch,
  calculateSleepScoreForManual,
} = require("@dtwin/ml-score-function");
const sleepRepository = require("./repositories/sleepRepository");
const HealthMetricRepository = require("../user/repositories/healthMetricRepository");
const HealthMetricsService = require("../user/healthMetricService");
const MonthlyHealthMetricService = require("../user/monthlyHealthMetricService");
const timezoneUtils = require("../../common/utils/timezone");
const { logger, info, errorLog, warn, debug } = require('@dtwin/config');

async function getDailySleepData(userId, date) {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error("Invalid date format. Please use 'YYYY-MM-DD'.");
  }
  return await sleepRepository.fetchSleepSessionByDate(
    userId,
    year,
    month,
    day
  );
}

async function getMonthlySleepData(userId, year, month) {
  // First check if monthly sleep data exists in health metrics
  const monthlyHealthMetric =
    await MonthlyHealthMetricService.getHealthMetricForMonth(
      userId,
      year,
      month,
      true
    );

  // Check if we need to refresh the data
  let needsRefresh = false;
  const currentDate = timezoneUtils.getCurrentIST();
  const isCurrentMonth =
    Number(year) === currentDate.getFullYear() &&
    Number(month) === currentDate.getMonth() + 1;

  if (isCurrentMonth) {
    needsRefresh = true;
  } else if (monthlyHealthMetric?.monthly_sleep_data) {
    // For past months, check if data is stale
    const lastSleepSession = await sleepRepository.getLastSleepSessionForMonth(
      userId,
      year,
      month
    );

    needsRefresh =
      lastSleepSession &&
      new Date(lastSleepSession.created_at) >
        new Date(monthlyHealthMetric.monthly_sleep_data.lastUpdated);
  }

  // Return cached data if valid
  if (monthlyHealthMetric?.monthly_sleep_data && !needsRefresh) {
    info("Returning cached monthly sleep data");
    return monthlyHealthMetric.monthly_sleep_data;
  }

  // Fetch fresh data from repository
  const sleepSessions = await sleepRepository.fetchSleepSessionsForMonth(
    userId,
    year,
    month
  );

  // Process each day's sleep session
  const dailySleepData = await Promise.all(
    sleepSessions.map(async (session) => {
      const dateInfo = await sleepRepository.getDateByDayId(session.dayId);
      const formattedDate = dateInfo?.formattedDate || null;

      // Get or calculate sleep score
      let sleepScore = null;
      if (formattedDate) {
        const healthMetric = await HealthMetricsService.getHealthMetric(
          userId,
          formattedDate
        );

        // Use existing score if available and not today
        const isToday = formattedDate === timezoneUtils.getCurrentISTDate();
        if (healthMetric?.sleep_score != null && !isToday) {
          sleepScore = healthMetric.sleep_score;
        } else {
          // Calculate fresh score for today or if missing
          const scoreResult = await getDailySleepScore(userId, formattedDate);
          sleepScore = scoreResult?.sleep_score || null;
        }
      }

      return {
        dayId: session.dayId,
        date: formattedDate,
        duration: session.durationSeconds,
        efficiencyScore: session.efficiencyScore,
        sleepScore,
        sessionId: session.id,
        startTime: session.startTime,
        endTime: session.endTime,
      };
    })
  );

  // Filter out days with null scores for average calculation
  const daysWithScores = dailySleepData.filter(
    (day) => day.sleepScore !== null
  );

  // Calculate summary statistics
  const summary = {
    totalDays: dailySleepData.length,
    totalSessions: dailySleepData.length, // 1 session per day
    averageDuration:
      dailySleepData.reduce((sum, day) => sum + day.duration, 0) /
      (dailySleepData.length || 1),
    averageEfficiency:
      dailySleepData.reduce((sum, day) => sum + (day.efficiencyScore || 0), 0) /
      (dailySleepData.length || 1),
    averageScore:
      daysWithScores.length > 0
        ? daysWithScores.reduce((sum, day) => sum + day.sleepScore, 0) /
          daysWithScores.length
        : null,
  };

  // Prepare complete monthly sleep data
  const monthlySleepData = {
    days: dailySleepData,
    summary,
    lastUpdated: timezoneUtils.toISTString(new Date()),
  };

  // Update monthly health metric
  await MonthlyHealthMetricService.updateHealthMetricForMonth(
    userId,
    year,
    month,
    {
      monthly_sleep_data: monthlySleepData,
      monthly_sleep_score: summary.averageScore,
    }
  );

  return monthlySleepData;
}

async function getSleepDataForRange(userId, startDate, endDate, stageType) {
  return await sleepRepository.fetchSleepSessionsByRange(
    userId,
    startDate,
    endDate,
    stageType
  );
}

const getBestSleepStage = async (userId, startDate, endDate) => {
  const start = timezoneUtils.toIST(new Date(startDate));
  const end = timezoneUtils.toIST(new Date(endDate));

  if (isNaN(start) || isNaN(end)) {
    throw new Error("Invalid date format");
  }

  if (start > end) {
    throw new Error("startDate must be before or equal to endDate");
  }

  let results = [];

  // If startDate and endDate are the same, fetch the best sleep stage for that day
  if (timezoneUtils.formatISTDate(start) === timezoneUtils.formatISTDate(end)) {
    const date = timezoneUtils.formatISTDate(start); // Format as YYYY-MM-DD
    const stage = await sleepRepository.findBestSleepStage(userId, date);

    if (stage) {
      return {
        date,
        bestSleepStage: stage.stageType,
        durationSeconds: stage.durationSeconds,
        startTime: stage.startTime,
        endTime: stage.endTime,
      };
    } else {
      return { message: "No valid sleep stage found for the given date" };
    }
  }

  // Loop through each date in the range and find the best stage for each day
  for (
    let currentDate = new Date(start);
    currentDate <= end;
    currentDate.setDate(currentDate.getDate() + 1)
  ) {
    const date = timezoneUtils.formatISTDate(currentDate); // Format as YYYY-MM-DD
    const stage = await sleepRepository.findBestSleepStage(userId, date);

    if (stage) {
      results.push({
        date,
        bestSleepStage: stage.stageType,
        durationSeconds: stage.durationSeconds,
        startTime: stage.startTime,
        endTime: stage.endTime,
      });
    }
  }

  return results.length
    ? results
    : { message: "No valid sleep stage found within the date range" };
};

const getSleepDataRange = async (
  userId,
  startDate,
  endDate,
  stageType,
  minDuration,
  maxDuration
) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start) || isNaN(end)) {
    throw new Error("Invalid date format");
  }

  if (start >= end) {
    throw new Error("startDate must be before endDate");
  }

  const result = await sleepRepository.fetchSleepSessionsByRange(
    userId,
    startDate,
    endDate,
    stageType,
    minDuration,
    maxDuration
  );

  return result.map((session) => ({
    startTime: session.startTime,
    endTime: session.endTime,
    durationSeconds: session.durationSeconds,
    efficiencyScore: session.efficiencyScore,
    stages: session.stages.map((stage) => ({
      startTime: stage.startTime,
      endTime: stage.endTime,
      durationSeconds: stage.durationSeconds,
      stageType: stage.stageType,
    })),
  }));
};

async function postSleepSessions(userId, sleepSessions) {
  const results = [];
  if (!Array.isArray(sleepSessions)) {
    throw new Error("sleepSessions must be an array");
  }

  for (const session of sleepSessions) {
    if (!session.sleepStages || typeof session.sleepStages !== "object") {
      throw new Error(
        "Each sleep session must include sleepStages as an array or object"
      );
    }

    const sleepStages = Array.isArray(session.sleepStages)
      ? session.sleepStages
      : Object.values(session.sleepStages);

    if (!Array.isArray(sleepStages)) {
      throw new Error(
        "sleepStages must be an array or convertible to an array"
      );
    }

    session.sleepStages = sleepStages;
  }

  for (const session of sleepSessions) {
    const { date, sleepStages } = session;
    const [year, month, day] = date.split("-").map(Number);

    if (!year || !month || !day) {
      throw new Error("Invalid date format. Please use 'YYYY-MM-DD'.");
    }

    // Check if sleep session already exists for this date
    const existingSession = await sleepRepository.fetchSleepSessionByDate(
      userId,
      year,
      month,
      day
    );

    if (existingSession) {
      // Delete existing session and its stages
      await sleepRepository.deleteSleepSession(existingSession.id);

      // Log the replacement
      results.push({
        message: "Existing sleep session replaced for date: " + date,
        replaced: true,
      });
    }

    // Create new sleep session
    const sleepSessionCreated = await sleepRepository.createSleepSession(
      userId,
      year,
      month,
      day,
      session,
      sleepStages
    );

    results.push({
      message: existingSession
        ? "Sleep session updated successfully"
        : "Sleep session created successfully",
      sleepSession: sleepSessionCreated,
    });
  }

  return results;
}

async function getDailySleepScore(userId, date) {
  // First check if sleep score exists in health metrics
  const healthMetric = await HealthMetricsService.getHealthMetric(userId, date);
  
  // Use the timezone utility to get current date in IST
  const currentDate = timezoneUtils.getCurrentISTDate();
  date = timezoneUtils.formatISTDate(new Date(date));

  // If score exists and it's not today's date, return the cached score
  if (healthMetric?.sleep_score != null && date !== currentDate) {
    debug("Returning cached sleep score:", healthMetric.sleep_score);
    return { sleep_score: healthMetric.sleep_score };
  }

  // Otherwise, calculate fresh score (either no score exists or it's today's date)
  const [year, month, day] = date.split("-").map(Number);

  const sleepSession = await sleepRepository.fetchSleepSessionByDate(
    userId,
    year,
    month,
    day
  );

  if (!sleepSession) {
    // If no sleep data exists, store null in health metrics
    await HealthMetricRepository.updateHealthMetricByDate(
      year,
      month,
      day,
      userId,
      { sleep_score: null }
    );
    return { message: "No sleep data found" };
  }

  // Fetch sleep sessions for the past 5 days
  const pastSleepSessions = [];
  for (let i = 1; i <= 5; i++) {
    const pastDate = format(subDays(new Date(date), 1), "yyyy-MM-dd");
    const [pastYear, pastMonth, pastDay] = pastDate.split("-").map(Number);
    const session = await sleepRepository.fetchSleepSessionByDate(
      userId,
      pastYear,
      pastMonth,
      pastDay
    );
    if (session) pastSleepSessions.push(session);
  }

  if (pastSleepSessions.length === 0) {
    return { message: "No past sleep data found" };
  }

  // Extract sleep stage durations
  const remSleep =
    sleepSession.stages
      .filter((stage) => stage.stageType === "REM")
      .reduce((sum, stage) => sum + stage.durationSeconds, 0) / 3600;

  const lightSleep =
    sleepSession.stages
      .filter((stage) => stage.stageType === "LIGHT")
      .reduce((sum, stage) => sum + stage.durationSeconds, 0) / 3600;

  const deepSleep =
    sleepSession.stages
      .filter((stage) => stage.stageType === "DEEP")
      .reduce((sum, stage) => sum + stage.durationSeconds, 0) / 3600;

  // Prepare input data
  const inputData = {
    totalSleepHours: sleepSession.durationSeconds / 3600,
    remSleep,
    lightSleep,
    deepSleep,
    last5Days: pastSleepSessions.map((session) => ({
      start: session.startTime,
      end: session.endTime,
    })),
    currentSleepStart: sleepSession.startTime,
    currentSleepEnd: sleepSession.endTime,
  };

  // Calculate sleep score
  const score = calculateSleepScoreForWatch(
    inputData.totalSleepHours,
    inputData.remSleep,
    inputData.lightSleep,
    inputData.deepSleep,
    inputData.last5Days,
    inputData.currentSleepStart,
    inputData.currentSleepEnd
  );

  // Update health metrics with the new score
  await HealthMetricsService.updateHealthMetricByDate(
    year,
    month,
    day,
    userId,
    {
      sleep_score: score,
    }
  );
  debug("Calculated sleep score:", score);
  return { sleep_score: score };
}

async function getMonthlySleepScore(userId, year, month) {
  try {
    // Validate input parameters
    if (!userId) {
      errorLog('Missing userId in getMonthlySleepScore');
      return { error: "User ID is required" };
    }
    
    if (!year || !month) {
      errorLog(`Invalid parameters in getMonthlySleepScore: year=${year}, month=${month}`);
      return { error: "Year and month are required" };
    }
    
    // Convert to numbers to ensure valid parameters
    const numYear = Number(year);
    const numMonth = Number(month);
    
    if (isNaN(numYear) || isNaN(numMonth) || numMonth < 1 || numMonth > 12) {
      errorLog(`Invalid year or month format: year=${year}, month=${month}`);
      return { error: "Invalid year or month format" };
    }
    
    // First check if monthly sleep score exists and is up-to-date
    const monthlyHealthMetric =
      await MonthlyHealthMetricService.getHealthMetricForMonth(
        userId,
        numYear,
        numMonth,
        true
      );

    // Check if we need to refresh the score
    let needsRefresh = false;
    const currentDate = new Date();
    const isCurrentMonth =
      numYear === currentDate.getFullYear() &&
      numMonth === currentDate.getMonth() + 1;

    if (isCurrentMonth) {
      needsRefresh = true;
    } else if (monthlyHealthMetric?.monthly_sleep_data) {
      const lastSleepSession = await sleepRepository.getLastSleepSessionForMonth(
        userId,
        numYear,
        numMonth
      );
      
      // Check if we need to refresh based on last session update time
      if (lastSleepSession && monthlyHealthMetric.monthly_sleep_data.lastUpdated) {
        needsRefresh =
          new Date(lastSleepSession.createdAt) >
          new Date(monthlyHealthMetric.monthly_sleep_data.lastUpdated);
      }
    }

    // Return cached score if valid
    if (monthlyHealthMetric?.monthly_sleep_score != null && !needsRefresh) {
      info("Returning cached monthly sleep score");
      return { monthly_sleep_score: monthlyHealthMetric.monthly_sleep_score };
    }

    // Get all day IDs for the month
    const dayIds = await sleepRepository.fetchMonthDayIDs(numYear, numMonth);
    if (!dayIds.length) {
      return { message: "No data found for the specified month" };
    }

    const validScores = [];

    // Process each day ID
    for (const dayId of dayIds) {
      // Get date information
      const dateInfo = await sleepRepository.getDateByDayId(dayId);
      if (!dateInfo) continue;

      const isToday =
        dateInfo.year === currentDate.getFullYear() &&
        dateInfo.month === currentDate.getMonth() + 1 &&
        dateInfo.day === currentDate.getDate();

      // Skip today's data for historical analysis
      if (!isCurrentMonth && isToday) continue;

      // Get health metric for this day
      const healthMetric = await HealthMetricsService.getHealthMetric(
        userId,
        dateInfo.formattedDate
      );

      if (healthMetric?.sleep_score != null) {
        validScores.push(healthMetric.sleep_score);
      } else {
        // Try to calculate if missing
        const scoreResult = await getDailySleepScore(
          userId,
          dateInfo.formattedDate
        );
        if (scoreResult?.sleep_score != null) {
          validScores.push(scoreResult.sleep_score);
        }
      }
    }

    if (validScores.length === 0) {
      return { monthly_sleep_score: null, message: "No scores available" };
    }

    // Calculate average
    const averageScore =
      validScores.reduce((sum, score) => sum + score, 0) / validScores.length;

    // Update monthly health metric
    await MonthlyHealthMetricService.updateHealthMetricForMonth(
      userId,
      numYear,
      numMonth,
      {
        monthly_sleep_score: averageScore,
        monthly_sleep_data: {
          ...monthlyHealthMetric?.monthly_sleep_data,
          lastUpdated: new Date().toISOString(),
        },
      }
    );

    return { monthly_sleep_score: averageScore };
  } catch (error) {
    errorLog(`Error in getMonthlySleepScore for user ${userId} in ${year}-${month}:`, error);
    return { 
      error: "An error occurred while calculating monthly sleep score",
      details: error.message
    };
  }
}

async function getSleepRecommendations(userId, date) {
  const [year, month, day] = date.split("-");
  console.log(date);
  console.log(year, month, day);
  const sleepSession = await sleepRepository.fetchSleepSessionByDate(
    userId,
    year,
    month,
    day
  );
  if (!sleepSession) return { message: "No sleep data found" };

  const recommendations =await sleepRepository.fetchSleepRecommendations(sleepSession);

  return { recommendations };
}

/**
 * Calculate sleep score for a given session
 * @param {Object} session - Sleep session object from database
 * @returns {number} - Sleep score from 0-100
 */
const getSleepScore = (session) => {
  // Get current date in IST
  const today = timezoneUtils.getCurrentISTDate();
  
  // Parse the session's date in IST
  const sessionDate = session.date;
  const sessionDateIST = timezoneUtils.formatISTDate(timezoneUtils.toIST(new Date(sessionDate)));
  
  // If session is not for today, return cached score if available
  if (sessionDateIST !== today && session.sleepScore !== null) {
    return session.sleepScore;
  }
  
  // Calculate sleep score components
  const durationScore = calculateDurationScore(session.totalDurationMinutes);
  const efficiencyScore = calculateEfficiencyScore(session.sleepEfficiency);
  const stageScore = calculateStageScore(session.deepSleepPercentage, session.remSleepPercentage);
  const continuityScore = calculateContinuityScore(session.awakeningsCount);
  
  // Calculate overall score (weighted average)
  const overallScore = Math.round(
    durationScore * 0.3 +
    efficiencyScore * 0.3 +
    stageScore * 0.3 +
    continuityScore * 0.1
  );
  
  return Math.max(0, Math.min(100, overallScore));
};

/**
 * Calculate daily sleep statistics for a user
 * @param {string} userId - User ID
 * @param {string} date - Date in ISO format
 * @returns {Object} - Sleep statistics for the specified day
 */
const calculateDayStats = async (userId, date) => {
  try {
    // Convert input date to IST
    const istDate = timezoneUtils.toIST(new Date(date));
    const formattedDate = timezoneUtils.formatISTDate(istDate);
    
    // Get all sleep sessions for the specified day
    const sessions = await SleepModel.find({
      userId,
      date: formattedDate
    });

    if (!sessions || sessions.length === 0) {
      return {
        date: formattedDate,
        totalSleepDuration: 0,
        averageSleepScore: 0,
        sessionsCount: 0
      };
    }

    // Calculate total sleep duration across all sessions
    const totalDuration = sessions.reduce((sum, session) => 
      sum + (session.totalDurationMinutes || 0), 0);
    
    // Calculate average sleep score
    let totalScore = 0;
    sessions.forEach(session => {
      const score = getSleepScore(session);
      totalScore += score;
    });
    
    const averageScore = Math.round(totalScore / sessions.length);
    
    return {
      date: formattedDate,
      totalSleepDuration: totalDuration,
      averageSleepScore: averageScore,
      sessionsCount: sessions.length
    };
  } catch (error) {
    errorLog('Error calculating day stats:', error);
    return null;
  }
};

/**
 * Get daily sleep statistics for a user on a specific date
 * @param {string} userId - User ID
 * @param {string} date - Date in ISO format (or 'today' for current date)
 * @returns {Object} - Sleep statistics for the specified day
 */
const getDailySleepStats = async (userId, date) => {
  try {
    let targetDate;
    
    // Handle 'today' parameter
    if (date === 'today') {
      targetDate = timezoneUtils.getCurrentIST();
    } else {
      // Convert input date to IST
      targetDate = timezoneUtils.toIST(new Date(date));
    }
    
    // Format date as YYYY-MM-DD
    const formattedDate = timezoneUtils.formatISTDate(targetDate);
    
    // Get the day's stats
    const stats = await calculateDayStats(userId, formattedDate);
    
    // Add the formatted date to response
    stats.date = formattedDate;
    
    // Calculate week average for context (last 7 days including target date)
    const weekStats = [];
    for (let i = 0; i < 7; i++) {
      const prevDate = new Date(targetDate);
      prevDate.setDate(prevDate.getDate() - i);
      const dayStats = await calculateDayStats(
        userId, 
        timezoneUtils.formatISTDate(prevDate)
      );
      weekStats.push(dayStats);
    }
    
    // Calculate 7-day average sleep score
    const validScores = weekStats.filter(day => day.averageSleepScore > 0);
    const weekAverage = validScores.length > 0 
      ? Math.round(validScores.reduce((sum, day) => sum + day.averageSleepScore, 0) / validScores.length) 
      : 0;
    
    return {
      ...stats,
      weekAverage
    };
  } catch (error) {
    errorLog('Error getting daily sleep stats:', error);
    return null;
  }
};

/**
 * Get monthly sleep statistics for a user
 * @param {string} userId - User ID
 * @param {string} year - Year in YYYY format
 * @param {string} month - Month in MM format (1-12)
 * @returns {Object} - Monthly sleep statistics
 */
const getMonthlyStats = async (userId, year, month) => {
  try {
    // Convert to numbers for validation
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    
    // Validate input
    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      throw new Error('Invalid year or month');
    }
    
    // Create first day of the month in IST
    const startDate = timezoneUtils.createISTDate(yearNum, monthNum - 1, 1);
    
    // Get last day of the month
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0);
    
    const daysInMonth = endDate.getDate();
    const monthData = [];
    
    // Collect data for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(day);
      
      const formattedDate = timezoneUtils.formatISTDate(currentDate);
      const dayStats = await calculateDayStats(userId, formattedDate);
      
      monthData.push({
        date: formattedDate,
        totalSleepDuration: dayStats.totalSleepDuration,
        averageSleepScore: dayStats.averageSleepScore,
        sessionsCount: dayStats.sessionsCount
      });
    }
    
    // Calculate monthly average sleep score (excluding days with no data)
    const daysWithData = monthData.filter(day => day.sessionsCount > 0);
    const averageSleepScore = daysWithData.length > 0
      ? Math.round(daysWithData.reduce((sum, day) => sum + day.averageSleepScore, 0) / daysWithData.length)
      : 0;
    
    // Calculate total sleep duration for the month
    const totalSleepDuration = monthData.reduce((sum, day) => sum + day.totalSleepDuration, 0);
    
    // Count days with sleep data
    const daysWithSleep = monthData.filter(day => day.sessionsCount > 0).length;
    
    return {
      year: yearNum,
      month: monthNum,
      daysInMonth,
      daysWithSleep,
      averageSleepScore,
      totalSleepDuration,
      dailyData: monthData
    };
  } catch (error) {
    errorLog('Error getting monthly sleep stats:', error);
    return null;
  }
};

/**
 * Get yearly sleep statistics for a user
 * @param {string} userId - User ID
 * @param {string} year - Year in YYYY format
 * @returns {Object} - Yearly sleep statistics
 */
const getYearlyStats = async (userId, year) => {
  try {
    // Convert to number for validation
    const yearNum = parseInt(year, 10);
    
    // Validate input
    if (isNaN(yearNum)) {
      throw new Error('Invalid year');
    }
    
    const monthlyData = [];
    
    // Collect data for each month
    for (let month = 1; month <= 12; month++) {
      const monthStats = await getMonthlyStats(userId, yearNum, month);
      monthlyData.push({
        month,
        daysWithSleep: monthStats.daysWithSleep,
        averageSleepScore: monthStats.averageSleepScore,
        totalSleepDuration: monthStats.totalSleepDuration
      });
    }
    
    // Calculate yearly averages
    const monthsWithData = monthlyData.filter(month => month.daysWithSleep > 0);
    
    const averageSleepScore = monthsWithData.length > 0
      ? Math.round(monthsWithData.reduce((sum, month) => sum + month.averageSleepScore, 0) / monthsWithData.length)
      : 0;
    
    // Calculate total sleep duration for the year
    const totalSleepDuration = monthlyData.reduce((sum, month) => sum + month.totalSleepDuration, 0);
    
    // Count total days with sleep data
    const daysWithSleep = monthlyData.reduce((sum, month) => sum + month.daysWithSleep, 0);
    
    return {
      year: yearNum,
      averageSleepScore,
      totalSleepDuration,
      daysWithSleep,
      monthlyData
    };
  } catch (error) {
    errorLog('Error getting yearly sleep stats:', error);
    return null;
  }
};

module.exports = {
  getDailySleepData,
  getMonthlySleepData,
  getSleepDataForRange,
  getBestSleepStage,
  postSleepSessions,
  getDailySleepScore,
  getMonthlySleepScore,
  getSleepRecommendations,
  getSleepDataRange,
  calculateDayStats,
  getDailySleepStats,
  getMonthlyStats,
  getYearlyStats,
};
