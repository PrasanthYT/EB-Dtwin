const userProfileService = require("../user/userProfileService");
const HealthMetricsService = require("../user/healthMetricService");
const MonthlyHealthMetricService = require("../user/monthlyHealthMetricService");
const { info, errorLog, warn, debug } = require("@dtwin/config");
const {
  calculateActivityScoreWithoutWatch,
  calculateActivityScoreWithWatch,
} = require("@dtwin/ml-score-function");
const timezoneUtils = require("../../common/utils/timezone");
const activityRepository = require("./repositories/activityRepository");

/**
 * Standard error response object
 * @param {string} code - Error code
 * @param {string} message - User-friendly message
 * @param {Error|string} error - Original error or detailed message
 * @param {Object} [details] - Additional context
 */
const createErrorResponse = (code, message, error, details = {}) => {
  errorLog(`Activity Service Error [${code}]: ${message}`, error);
  return {
    success: false,
    error: {
      code,
      message,
      details: {
        ...details,
        originalError: error?.message || error,
      },
    },
  };
};

async function getDailyActivityScore(userId, date) {
  try {
    // Validate inputs
    if (!userId) {
      return createErrorResponse(
        "INVALID_USER_ID",
        "User ID is required",
        "Missing userId parameter"
      );
    }

    if (!date) {
      return createErrorResponse(
        "INVALID_DATE",
        "Date is required in YYYY-MM-DD format",
        "Missing date parameter"
      );
    }

    // First check if activity score exists in health metrics
    const healthMetric = await HealthMetricsService.getHealthMetric(
      userId,
      date
    );

    // // Use the timezone utility to get current date in IST
    const currentDate = timezoneUtils.getCurrentISTDate();
    date = timezoneUtils.formatISTDate(new Date(date));

    // If score exists and it's not today's date, return the cached score
    if (healthMetric?.activity_score != null && date !== currentDate) {
      info("returning cached activity score");
      return {
        success: true,
        activity_score: healthMetric.activity_score,
        caloriesBurned: healthMetric.total_calories_burnt,
      };
    }

    // Otherwise, calculate fresh score (either no score exists or it's today's date)
    const activities = await activityRepository.fetchActivitiesByDate(
      userId,
      date
    );
    if (!activities.length) {
      return createErrorResponse(
        "NO_ACTIVITY_DATA",
        "No activity data found for the specified date",
        null,
        { userId, date }
      );
    }

    const userData = await userProfileService.getProfile(userId);
    if (!userData) {
      return createErrorResponse(
        "USER_NOT_FOUND",
        "User profile not found",
        null,
        { userId }
      );
    }

    const { age, weight_kg, height_cm, target_calories, hasWatch } = userData;

    if (!age || !weight_kg || !height_cm || !target_calories) {
      return createErrorResponse(
        "INCOMPLETE_USER_PROFILE",
        "User profile data is incomplete",
        null,
        {
          userId,
          missingFields: [
            !age ? "age" : null,
            !weight_kg ? "weight_kg" : null,
            !height_cm ? "height_cm" : null,
            !target_calories ? "target_calories" : null,
          ].filter(Boolean),
        }
      );
    }

    const total_calories_burned_today = healthMetric?.total_calories_burnt || 0;
    const maxHR = 220 - age; // Default max heart rate calculation
    // Get heart data if user has watch
    let heartData = null;
    if (hasWatch) {
      heartData = await HealthMetricsService.getOrCreateHeartData(userId, date);
    }
    info(activities);

    const activityScores = await Promise.all(
      activities.map(async (activity) => {
        const durationMinutes = activity.duration_seconds / 60;
        // info(hasWatch,heartData,heartData.heart_rate_data)
        if (hasWatch && heartData && heartData.heart_rate_data) {
          let activityHeartRateData = [];

          if (activity.start_time && heartData.heart_rate_data.length > 0) {
            // Parse the activity timestamps as IST
            const activityStartTime = new Date(activity.start_time);
            const activityEndTime = activity.end_time
              ? new Date(activity.end_time)
              : new Date(
                  activityStartTime.getTime() + activity.duration_seconds * 1000
                );

            // Convert to IST for consistent time comparison
            // Extract hours, minutes, seconds in IST (not UTC)
            // IST is already handled by our time storage, so just use local time values
            const startTime = timezoneUtils.toIST(activityStartTime);
            const endTime = timezoneUtils.toIST(activityEndTime);

            // Get hours, minutes, seconds from IST time
            const startHours = startTime.getHours();
            const startMinutes = startTime.getMinutes();
            const startSeconds = startTime.getSeconds();

            const endHours = endTime.getHours();
            const endMinutes = endTime.getMinutes();
            const endSeconds = endTime.getSeconds();

            // Format as HH:MM:SS strings for comparison
            const activityStartTimeStr = `${String(startHours).padStart(
              2,
              "0"
            )}:${String(startMinutes).padStart(2, "0")}:${String(
              startSeconds
            ).padStart(2, "0")}`;
            const activityEndTimeStr = `${String(endHours).padStart(
              2,
              "0"
            )}:${String(endMinutes).padStart(2, "0")}:${String(
              endSeconds
            ).padStart(2, "0")}`;

            info(
              `Activity time range: ${activityStartTimeStr} - ${activityEndTimeStr}`
            );

            // Filter heart rate data within the activity time range
            activityHeartRateData = heartData.heart_rate_data
              .filter((hrEntry) => {
                if (!hrEntry || !hrEntry.time) {
                  warn("Invalid heart rate entry:", hrEntry);
                  return false;
                }
                const result =
                  hrEntry.time >= activityStartTimeStr &&
                  hrEntry.time <= activityEndTimeStr;
                return result;
              })
              .map((hrEntry) => hrEntry.value);

            info(
              `Found ${activityHeartRateData.length} heart rate data points for this activity`
            );
          }
          // Use heart rate data if available, otherwise fall back to average
          const heartRatesToUse =
            activityHeartRateData.length > 0
              ? activityHeartRateData
              : [
                  activity.heart_rate_avg ||
                    (heartData.dataValues
                      ? heartData.dataValues.heart_rate_avg
                      : 70),
                ];
          info(activity.activity_type);
          const { activityScore, estimatedCaloriesBurned } =
            calculateActivityScoreWithWatch(
              activity.activity_type,
              durationMinutes,
              weight_kg,
              height_cm,
              age,
              target_calories,
              total_calories_burned_today,
              heartRatesToUse,
              heartData.resting_heart_rate || 70,
              heartData.max_heart_rate || maxHR,
              activity.steps_count || 0,
              healthMetric?.vo2Max || 0
            );

          return {
            score: activityScore,
            caloriesBurned: estimatedCaloriesBurned,
          };
        } else {
          // Without watch calculation
          const { activityScore, estimatedCaloriesBurned } =
            calculateActivityScoreWithoutWatch(
              activity.activity_type,
              durationMinutes,
              weight_kg,
              height_cm,
              age,
              target_calories,
              total_calories_burned_today
            );

          return {
            score: activityScore,
            caloriesBurned: estimatedCaloriesBurned,
          };
        }
      })
    );
    info("Activity scores:", activityScores);
    const totalScore = activityScores.reduce((sum, act) => sum + act.score, 0);
    const totalCaloriesBurned = activityScores.reduce(
      (sum, act) => sum + act.caloriesBurned,
      0
    );
    const calorieAchievement = (totalCaloriesBurned / target_calories) * 50;
    const averageActivityScore = totalScore / activityScores.length;

    const dailyScore = Math.round(
      Math.min(100, Math.max(0, calorieAchievement + averageActivityScore))
    );

    const [year, month, day] = date.split("-").map(Number);
    // Update health metrics with the new score
    await HealthMetricsService.updateHealthMetricByDate(
      year,
      month,
      day,
      userId,
      {
        activity_score: dailyScore,
        activity_score_array: healthMetric?.activity_score_array
          ? [...healthMetric.activity_score_array, dailyScore]
          : [dailyScore],
        total_calories_burnt: totalCaloriesBurned,
      }
    );
    return { activity_score: dailyScore, caloriesBurned: totalCaloriesBurned };
  } catch (error) {
    return createErrorResponse(
      "ACTIVITY_SCORE_CALCULATION_ERROR",
      "Failed to calculate activity score",
      error,
      { userId, date }
    );
  }
}

async function getTopActivitiesForDay(userId, date, limit = 3) {
  const activities = await activityRepository.fetchActivitiesByDate(
    userId,
    date
  );
  if (!activities.length) return { message: "No activity data found" };

  activities.sort((a, b) => b.duration_seconds - a.duration_seconds);
  return activities.slice(0, limit);
}

async function getMonthlyActivityScore(userId, year, month) {
  try {
    // Validate inputs
    if (!userId) {
      return createErrorResponse(
        "INVALID_USER_ID",
        "User ID is required",
        "Missing userId parameter"
      );
    }

    if (!year || !month) {
      return createErrorResponse(
        "INVALID_DATE_PARAMS",
        "Year and month are required",
        `Invalid parameters: year=${year}, month=${month}`
      );
    }

    // First check if monthly activity score exists and is up-to-date
    const monthlyHealthMetric =
      await MonthlyHealthMetricService.getHealthMetricForMonth(
        userId,
        year,
        month,
        true // showJson = true to get full data
      );

    // Check if we need to refresh the score
    let needsRefresh = false;
    const currentDate = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST = UTC +5:30
    const istDate = new Date(currentDate.getTime() + istOffset);

    const isCurrentMonth =
      Number(year) === istDate.getFullYear() &&
      Number(month) === istDate.getMonth() + 1;

    if (isCurrentMonth) {
      needsRefresh = true;
    } else if (monthlyHealthMetric?.monthly_activity_data) {
      // Verify if all activity scores are up-to-date
      const lastActivity = await activityRepository.getLastActivityForMonth(
        userId,
        year,
        month
      );

      needsRefresh =
        lastActivity &&
        new Date(lastActivity.created_at) >
          new Date(monthlyHealthMetric.monthly_activity_data.lastUpdated);
    }

    // Return cached score if valid
    if (monthlyHealthMetric?.monthly_activity_score != null && !needsRefresh) {
      info("Using cached monthly activity score");
      return {
        monthly_activity_score: monthlyHealthMetric.monthly_activity_score,
      };
    }

    // Get all day IDs for the month
    const dayIds = await activityRepository.fetchMonthDayIDs(year, month);
    if (!dayIds.length) {
      return createErrorResponse(
        "NO_MONTHLY_DATA",
        "No activity data found for the specified month",
        null,
        { userId, year, month }
      );
    }

    const validScores = [];

    // Process each day ID
    for (const dayId of dayIds) {
      // Get date information
      const dateInfo = await activityRepository.getDateByDayId(dayId);
      if (!dateInfo) continue;

      const isToday =
        dateInfo.year === currentDate.getFullYear() &&
        dateInfo.month === currentDate.getMonth() + 1 &&
        dateInfo.day === currentDate.getDate();

      let activityScore = null;

      if (isToday) {
        // For current day, always calculate fresh score
        const dailyScoreResult = await getDailyActivityScore(
          userId,
          dateInfo.formattedDate
        );
        activityScore = dailyScoreResult?.activity_score || null;
      } else {
        // For past days, check health metric first
        const healthMetric = await HealthMetricsService.getHealthMetric(
          userId,
          dateInfo.formattedDate
        );

        if (healthMetric?.activity_score != null) {
          activityScore = healthMetric.activity_score;
        } else {
          // Calculate if not available
          const dailyScoreResult = await getDailyActivityScore(
            userId,
            dateInfo.formattedDate
          );
          activityScore = dailyScoreResult?.activity_score || null;
        }
      }

      // Add valid score to array for averaging
      if (activityScore !== null) {
        validScores.push(activityScore);
      }
    }

    if (!validScores.length) {
      return {
        message: "No valid activity scores found for the specified month",
      };
    }

    // Calculate average
    const avgScore =
      validScores.reduce((sum, score) => sum + score, 0) / validScores.length;

    // Update monthly health metric with the new score
    await MonthlyHealthMetricService.updateHealthMetricForMonth(
      userId,
      year,
      month,
      {
        monthly_activity_score: avgScore,
      }
    );

    return { monthly_activity_score: avgScore };
  } catch (error) {
    return createErrorResponse(
      "MONTHLY_ACTIVITY_SCORE_ERROR",
      "Failed to calculate monthly activity score",
      error,
      { userId, year, month }
    );
  }
}

async function getLastActivityHours(userId, year, month, day) {
  const lastActivity = await activityRepository.getLastActivityForDay(
    userId,
    year,
    month,
    day
  );

  if (!lastActivity) {
    return { message: "No activity found for the specified day" };
  }

  const lastActivityTime = new Date(lastActivity.end_time);
  const currentTime = new Date();
  const hoursSinceLastActivity = Math.abs(
    (currentTime - lastActivityTime) / (1000 * 60 * 60)
  );

  return { hoursSinceLastActivity: hoursSinceLastActivity.toFixed(2) };
}

async function getActivityCountsPerDay(userId, year, month) {
  const activities = await activityRepository.fetchActivitiesForMonth(
    userId,
    year,
    month
  );
  const activityCounts = {};
  const activityDates = {};

  activities.forEach(({ dayId, dataValues }) => {
    const date = new Date(dataValues.start_time).getDate();
    activityCounts[dayId] = (activityCounts[dayId] || 0) + 1;
    activityDates[dayId] = date;
  });

  return Object.entries(activityCounts).map(([dayId, activity_count]) => ({
    dayId,
    activity_count,
    date: activityDates[dayId],
  }));
}

async function getActivitySuggestions(userId) {
  return [{ suggestion: "lol", otherData: {} }];
}

async function getActivitiesInRange(
  userId,
  startDate,
  endDate,
  activityType,
  minDuration,
  maxDuration
) {
  try {
    // Validate inputs
    if (!userId) {
      return createErrorResponse(
        "INVALID_USER_ID",
        "User ID is required",
        "Missing userId parameter"
      );
    }

    if (!startDate || !endDate) {
      return createErrorResponse(
        "INVALID_DATE_RANGE",
        "Start date and end date are required",
        "Missing date range parameters",
        { startDate, endDate }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return createErrorResponse(
        "INVALID_DATE_FORMAT",
        "Invalid date format. Please use YYYY-MM-DD format",
        null,
        { startDate, endDate }
      );
    }

    if (start > end) {
      return createErrorResponse(
        "INVALID_DATE_ORDER",
        "Start date must be before or equal to end date",
        null,
        { startDate, endDate }
      );
    }

    const activities = await activityRepository.fetchActivitiesByRange(
      userId,
      startDate,
      endDate,
      activityType,
      minDuration,
      maxDuration
    );
    return { activities, message: "Activities fetched successfully" };
  } catch (error) {
    return createErrorResponse(
      "ACTIVITY_RANGE_QUERY_ERROR",
      "Failed to retrieve activities in the specified range",
      error,
      { userId, startDate, endDate, activityType, minDuration, maxDuration }
    );
  }
}

async function getMonthlyActivityStats(userId, year, month) {
  const monthlyHealthMetric =
    await MonthlyHealthMetricService.getHealthMetricForMonth(
      userId,
      year,
      month,
      true
    );

  // Check if we need to refresh the data
  let needsRefresh = false;
  const currentDate = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST = UTC +5:30
  const istDate = new Date(currentDate.getTime() + istOffset);

  const isCurrentMonth =
    year === istDate.getFullYear() && month === istDate.getMonth() + 1;

  if (isCurrentMonth) {
    needsRefresh = true;
  } else if (monthlyHealthMetric?.monthly_activity_data) {
    const lastActivity = await activityRepository.getLastActivityForMonth(
      userId,
      year,
      month
    );
    needsRefresh =
      lastActivity &&
      new Date(lastActivity.created_at) >
        new Date(monthlyHealthMetric.monthly_activity_data.lastUpdated);

    if (!needsRefresh) {
      const daysWithActivities = await activityRepository.getDaysWithActivities(
        userId,
        year,
        month
      );
      const cachedDays = new Set(
        monthlyHealthMetric.monthly_activity_data.days.map((day) => day.dayId)
      );
      needsRefresh = daysWithActivities.some((dayId) => !cachedDays.has(dayId));
    }
  }

  if (monthlyHealthMetric?.monthly_activity_data && !needsRefresh) {
    info("Using cached monthly activity data");
    return monthlyHealthMetric.monthly_activity_data;
  }

  const activities = await activityRepository.fetchActivitiesForMonth(
    userId,
    year,
    month
  );

  const activitiesByDay = {};
  activities.forEach((activity) => {
    const dayId = activity.dayId;
    activitiesByDay[dayId] = activitiesByDay[dayId] || [];
    activitiesByDay[dayId].push(activity);
  });

  const dailyStats = await Promise.all(
    Object.entries(activitiesByDay).map(async ([dayId, dayActivities]) => {
      const dateInfo = await activityRepository.getDateByDayId(dayId);
      const dayNumber = dateInfo?.day || null;
      const formattedDate = dateInfo?.formattedDate;

      // Calculate total duration for the day
      const totalDuration = dayActivities.reduce(
        (sum, activity) => sum + activity.duration_seconds,
        0
      );

      // Get or calculate activity score
      let activityScore = null;
      if (formattedDate) {
        // First try to get from health metrics
        const healthMetric = await HealthMetricsService.getHealthMetric(
          userId,
          formattedDate
        );
        activityScore = healthMetric?.activity_score;

        // If score is null and we have activities, calculate it
        if (activityScore === null && dayActivities.length > 0) {
          const scoreResult = await getDailyActivityScore(
            userId,
            formattedDate
          );
          activityScore = scoreResult?.activity_score || null;
        }
      }

      return {
        dayId,
        dayNumber,
        totalDuration,
        activities: dayActivities.map((activity) => ({
          activityId: activity.id,
          activityType: activity.activity_type,
          durationSeconds: activity.duration_seconds,
          startTime: activity.start_time,
          endTime: activity.end_time,
          caloriesBurned: activity.calories_burned,
        })),
        activityScore,
      };
    })
  );

  // Filter out days with null scores for average calculation
  const daysWithScores = dailyStats.filter((day) => day.activityScore !== null);
  const averageActivityScore =
    daysWithScores.length > 0
      ? daysWithScores.reduce((sum, day) => sum + day.activityScore, 0) /
        daysWithScores.length
      : null;

  const monthlyActivityData = {
    days: dailyStats,
    summary: {
      totalDaysWithActivities: dailyStats.length,
      totalActivities: activities.length,
      averageDailyDuration:
        dailyStats.reduce((sum, day) => sum + day.totalDuration, 0) /
        (dailyStats.length || 1),
      averageActivityScore,
      mostFrequentActivity: calculateMostFrequentActivity(activities),
    },
    lastUpdated: new Date().toISOString(),
  };

  await MonthlyHealthMetricService.updateHealthMetricForMonth(
    userId,
    year,
    month,
    {
      monthly_activity_data: monthlyActivityData,
      monthly_activity_score: averageActivityScore,
    }
  );

  return monthlyActivityData;
}

// Helper function to find most frequent activity
function calculateMostFrequentActivity(activities) {
  const activityCounts = {};
  activities.forEach((activity) => {
    activityCounts[activity.activity_type] =
      (activityCounts[activity.activity_type] || 0) + 1;
  });

  let mostFrequent = null;
  let maxCount = 0;
  for (const [activity, count] of Object.entries(activityCounts)) {
    if (count > maxCount) {
      mostFrequent = activity;
      maxCount = count;
    }
  }

  return mostFrequent;
}

async function getActivityById(activityId) {
  return await activityRepository.fetchActivityById(activityId);
}

async function createActivity(userId, activitiesData) {
  try {
    // Validate inputs
    if (!userId) {
      return createErrorResponse(
        "INVALID_USER_ID",
        "User ID is required",
        "Missing userId parameter"
      );
    }

    if (!activitiesData || !Array.isArray(activitiesData)) {
      return createErrorResponse(
        "INVALID_ACTIVITY_DATA",
        "Activity data must be provided as an array",
        null,
        { receivedType: typeof activitiesData }
      );
    }

    const results = [];
    const errors = [];

    for (const activity of activitiesData) {
      try {
        // Validate required fields
        if (
          !activity.date ||
          !activity.activity_type ||
          !activity.duration_seconds
        ) {
          errors.push({
            activity,
            code: "MISSING_REQUIRED_FIELDS",
            message: "Activity is missing required fields",
            details: {
              missingFields: [
                !activity.date ? "date" : null,
                !activity.activity_type ? "activity_type" : null,
                !activity.duration_seconds ? "duration_seconds" : null,
              ].filter(Boolean),
            },
          });
          continue;
        }

        const date = new Date(activity.start_time).toISOString().split("T")[0]; // Extract YYYY-MM-DD
        const [year, month, day] = date.split("-").map(Number);

        activity.duration_seconds =
          activity.duration_seconds ||
          (activity.end_time
            ? Math.floor(
                (new Date(activity.end_time) - new Date(activity.start_time)) /
                  1000
              )
            : null);

        const activitySession = await activityRepository.createActivity(
          userId,
          year,
          month,
          day,
          activity
        );

        results.push(activitySession);
      } catch (activityError) {
        errors.push({
          activity,
          code: "ACTIVITY_CREATION_ERROR",
          message: "Failed to create activity",
          details: { originalError: activityError.message },
        });
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return createErrorResponse(
      "ACTIVITY_CREATION_FAILED",
      "Failed to create activities",
      error,
      { userId, activitiesCount: activitiesData?.length || 0 }
    );
  }
}

module.exports = {
  getDailyActivityScore,
  getTopActivitiesForDay,
  getMonthlyActivityScore,
  getActivityCountsPerDay,
  getActivitySuggestions,
  getActivitiesInRange,
  getMonthlyActivityStats,
  getLastActivityHours,
  getActivityById,
  createActivity,
};
