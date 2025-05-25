const { subDays, format } = require("date-fns");
const { info, errorLog, warn, debug } = require("@dtwin/config");
const {
  calculateMetabolicScoreWithoutWatch,
  calculateMetabolicScoreWithWatch,
  calculateBMR,
} = require("@dtwin/ml-score-function");
const foodRepository = require("./repositories/foodRepository");
const HealthMetricsService = require("../user/healthMetricService");
const userProfileService = require("../user/userProfileService");
const activityService = require("../activity/activityService");
const MonthlyHealthMetricService = require("../user/monthlyHealthMetricService");
const { calculateFoodScore } = require("@dtwin/ml-score-function");
const timezoneUtils = require("../../common/utils/timezone");

/**
 * Standard error response object
 * @param {string} code - Error code
 * @param {string} message - User-friendly message
 * @param {Error|string} error - Original error or detailed message
 * @param {Object} [details] - Additional context
 */
const createErrorResponse = (code, message, error, details = {}) => {
  errorLog(`Food Service Error [${code}]: ${message}`, error);
  return {
    success: false,
    error: {
      code,
      message,
      details: {
        ...details,
        originalError: error?.message || error
      }
    }
  };
};

async function getDailyFoodData(userId, date) {
  try {
    // Validate inputs
    if (!userId) {
      return createErrorResponse(
        'INVALID_USER_ID',
        'User ID is required',
        'Missing userId parameter'
      );
    }

    if (!date) {
      return createErrorResponse(
        'INVALID_DATE',
        'Date is required in YYYY-MM-DD format',
        'Missing date parameter'
      );
    }

    const [year, month, day] = date.split("-").map(Number);
    if (!year || !month || !day) {
      return createErrorResponse(
        'INVALID_DATE_FORMAT',
        'Invalid date format. Please use YYYY-MM-DD format',
        `Invalid date components: year=${year}, month=${month}, day=${day}`,
        { date }
      );
    }

    const session = await foodRepository.fetchDailyFoodData(
      userId,
      year,
      month,
      day
    );

    if (!session) {
      return {
        success: true,
        message: "No food session found for this date",
        data: null,
      };
    }

    // Group food items by mealType
    const meals = {};
    session.foodItems.forEach((item) => {
      if (!meals[item.mealType]) {
        meals[item.mealType] = [];
      }
      meals[item.mealType].push({
        foodName: item.foodName,
        calories: item.macronutrients.energy_kcal,
        protien: item.macronutrients.protein_g,
        carbs: item.macronutrients.carbohydrates_g,
        fats: item.macronutrients.fat_g,
        time: item.createdAt,
        imageUrl: item.imageUrl,
      });
    });

    return {
      success: true,
      id: session.id,
      sessionTime: session.sessionTime,
      totalCalories: session.totalCalories,
      totalProtein: session.totalProtein,
      totalCarbs: session.totalCarbs,
      totalFats: session.totalFats,
      scores: session.scores,
      meals: meals,
    };
  } catch (error) {
    return createErrorResponse(
      'DAILY_FOOD_DATA_ERROR',
      'Failed to retrieve daily food data',
      error,
      { userId, date }
    );
  }
}

async function getMonthlyFoodData(userId, year, month) {
  try {
    // Validate inputs
    if (!userId) {
      return createErrorResponse(
        'INVALID_USER_ID',
        'User ID is required',
        'Missing userId parameter'
      );
    }

    if (!year || !month) {
      return createErrorResponse(
        'INVALID_DATE_PARAMS',
        'Year and month are required',
        `Invalid parameters: year=${year}, month=${month}`
      );
    }

    // Check if valid numerical values
    const yearNum = Number(year);
    const monthNum = Number(month);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return createErrorResponse(
        'INVALID_DATE_VALUE',
        'Year or month has invalid value',
        `Invalid values: year=${year}, month=${month}`,
        { year, month }
      );
    }

  const monthlyHealthMetric =
    await MonthlyHealthMetricService.getHealthMetricForMonth(
      userId,
      year,
      month,
      true
    );

  let needsRefresh = false;
  const currentDate = timezoneUtils.getCurrentIST();
  const istDate = currentDate;

  const isCurrentMonth =
    Number(year) === istDate.getFullYear() &&
    Number(month) === istDate.getMonth() + 1;

  if (isCurrentMonth) {
    needsRefresh = true;
  } else if (monthlyHealthMetric?.monthly_food_data) {
    const lastFoodSession = await foodRepository.getLastFoodSessionForMonth(
      userId,
      year,
      month
    );
    needsRefresh =
      lastFoodSession &&
      new Date(lastFoodSession.created_at) >
        new Date(monthlyHealthMetric.monthly_food_data.lastUpdated);
  }

  if (monthlyHealthMetric?.monthly_food_data && !needsRefresh) {
    info("Returning cached monthly food data:");
      return {
        success: true,
        ...monthlyHealthMetric.monthly_food_data
      };
  }

  const foodSessions = await foodRepository.fetchFoodSessionsForMonth(
    userId,
    year,
    month
  );

    if (!foodSessions || foodSessions.length === 0) {
      return {
        success: true,
        message: "No food data found for the specified month",
        days: [],
        summary: {
          totalDays: 0,
          monthlyFoodScore: null,
          totalMealCount: 0
        }
      };
    }

  const dailyFoodData = await Promise.all(
    foodSessions.map(async (session) => {
      const dateInfo = await foodRepository.getDateByDayId(session.dayId);
      const formattedDate = dateInfo?.formattedDate || null;

      let foodScore = null;
      if (formattedDate) {
        const healthMetric = await HealthMetricsService.getHealthMetric(
          userId,
          formattedDate
        );

        const isToday = formattedDate === timezoneUtils.getCurrentISTDate();
        if (healthMetric?.food_score != null && !isToday) {
          foodScore = healthMetric.food_score;
        } else {
          const scoreResult = await getDailyFoodScore(userId, formattedDate);
          foodScore = scoreResult?.food_score || null;
        }
      }

      return {
        dayId: session.dayId,
        date: formattedDate,
        calories: session.totalCalories,
        foodScore,
        mealScores: session.scores,
        sessionId: session.id,
      };
    })
  );

  const daysWithScores = dailyFoodData.filter((day) => day.foodScore !== null);

  const summary = {
    totalDays: dailyFoodData.length,
    monthlyFoodScore:
      daysWithScores.length > 0
        ? daysWithScores.reduce((sum, day) => sum + day.foodScore, 0) /
          daysWithScores.length
        : null,
    totalMealCount: dailyFoodData.reduce((count, day) => {
      const mealTypes = new Set(
        day.mealScores ? Object.keys(day.mealScores) : []
      );
      return count + mealTypes.size;
    }, 0),
  };

  const monthlyFoodData = {
    days: dailyFoodData,
    summary,
    lastUpdated: timezoneUtils.toISTString(new Date()),
  };

  await MonthlyHealthMetricService.updateHealthMetricForMonth(
    userId,
    year,
    month,
    {
      monthly_food_intake_data: monthlyFoodData,
      monthly_food_score: summary.monthlyFoodScore,
    }
  );

    return {
      success: true,
      ...monthlyFoodData
    };
  } catch (error) {
    return createErrorResponse(
      'MONTHLY_FOOD_DATA_ERROR',
      'Failed to retrieve monthly food data',
      error,
      { userId, year, month }
    );
  }
}

async function getFoodDataRange(userId, startDate, endDate, filters = {}) {
  try {
    // Validate inputs
    if (!userId) {
      return createErrorResponse(
        'INVALID_USER_ID',
        'User ID is required',
        'Missing userId parameter'
      );
    }

    if (!startDate || !endDate) {
      return createErrorResponse(
        'INVALID_DATE_RANGE',
        'Start date and end date are required',
        'Missing date range parameters',
        { startDate, endDate }
      );
    }

    // Validate date formats
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return createErrorResponse(
        'INVALID_DATE_FORMAT',
        'Invalid date format. Please use YYYY-MM-DD format',
        null,
        { startDate, endDate }
      );
    }

    if (start > end) {
      return createErrorResponse(
        'INVALID_DATE_ORDER',
        'Start date must be before or equal to end date',
        null,
        { startDate, endDate }
      );
    }

    const sessions = await foodRepository.fetchFilteredFoodSessions(
      userId,
      startDate,
      endDate,
      filters
    );

    if (!sessions || sessions.length === 0) {
      return {
        success: true,
        message: "No food data found for the specified date range",
        data: []
      };
    }

    // Group sessions by date (using the date from Day model)
    const daysMap = new Map();

    sessions.forEach((session) => {
      // Use the date from the Day model instead of sessionTime
      const dateKey = session.date; // This comes from the repository function

      if (!daysMap.has(dateKey)) {
        daysMap.set(dateKey, {
          date: dateKey,
          year: session.year,
          month: session.month,
          day: session.day,
          sessions: [],
        });
      }

      // Add the session to the appropriate date
      const dayData = daysMap.get(dateKey);
      const mealTypes = new Set(
        session.foodItems.map((item) => item.mealType)
      );

      dayData.sessions.push({
        id: session.id,
        sessionTime: session.sessionTime,
        totalCalories: session.totalCalories,
        mealTypes: Array.from(mealTypes),
        foodItems: session.foodItems.map((item) => ({
          id: item.id,
          foodName: item.foodName,
          mealType: item.mealType,
          calories: item.macronutrients.energy_kcal,
          protein: item.macronutrients.protein_g,
          carbs: item.macronutrients.carbohydrates_g,
          fats: item.macronutrients.fat_g,
          imageUrl: item.imageUrl,
          time: item.createdAt,
        })),
      });
    });

    return {
      success: true,
      data: Array.from(daysMap.values()),
    };
  } catch (error) {
    return createErrorResponse(
      'FOOD_DATA_RANGE_ERROR',
      'Failed to retrieve food data for date range',
      error,
      { userId, startDate, endDate, filters }
    );
  }
}

async function postFoodSession(userId, sessionData) {
  try {
    // Validate inputs
    if (!userId) {
      return createErrorResponse(
        'INVALID_USER_ID',
        'User ID is required',
        'Missing userId parameter'
      );
    }

    if (!sessionData) {
      return createErrorResponse(
        'INVALID_SESSION_DATA',
        'Food session data is required',
        'Missing sessionData parameter'
      );
    }

    if (!sessionData.date) {
      return createErrorResponse(
        'MISSING_DATE',
        'Date is required for food session',
        'Missing date in sessionData',
        { sessionData }
      );
    }

    if (!sessionData.foodItems || !Array.isArray(sessionData.foodItems) || sessionData.foodItems.length === 0) {
      return createErrorResponse(
        'INVALID_FOOD_ITEMS',
        'Food items array is required and must not be empty',
        'Missing or invalid foodItems in sessionData',
        { sessionData }
      );
    }

    const [year, month, day] = sessionData.date.split("-").map(Number);

  if (!year || !month || !day) {
      return createErrorResponse(
        'INVALID_DATE_FORMAT',
        'Invalid date format. Please use YYYY-MM-DD format',
        'Invalid date components in sessionData.date',
        { date: sessionData.date }
      );
  }

    // Create or get the food session for the specified date
    const session = await foodRepository.getOrCreateFoodSession(
    userId,
    year,
    month,
    day
  );

    // Process each food item
    const invalidItems = [];
    const processedItems = [];

    for (const item of sessionData.foodItems) {
      // Validate food item
      if (!item.foodName || !item.mealType) {
        invalidItems.push({ 
          item, 
          reason: 'Missing required fields: foodName and mealType are required' 
        });
        continue;
    }

      try {
        // Create the food item
        const foodItem = await foodRepository.createFoodItem(session.id, {
      foodName: item.foodName,
          mealType: item.mealType,
          imageUrl: item.imageUrl || null,
          macronutrients: {
            energy_kcal: item.calories || 0,
            protein_g: item.protein || 0,
            carbohydrates_g: item.carbs || 0,
            fat_g: item.fats || 0,
          },
        });

        processedItems.push(foodItem);
      } catch (itemError) {
        invalidItems.push({ 
          item, 
          reason: 'Error creating food item',
          error: itemError.message 
        });
      }
    }

    // Update the session's total macronutrients
    await foodRepository.updateSessionTotals(session.id);

    // Calculate and store food scores
    const date = `${year}-${month.toString().padStart(2, "0")}-${day
      .toString()
      .padStart(2, "0")}`;
    
    let scoreResult = null;
    try {
      scoreResult = await getDailyFoodScore(userId, date);
    } catch (scoreError) {
      debug('Error calculating food score:', scoreError);
      // Continue even if score calculation fails
    }

    return {
      success: invalidItems.length === 0,
      message: "Food session processed",
      sessionId: session.id,
      processedItems: processedItems.length,
      invalidItems: invalidItems.length > 0 ? invalidItems : undefined,
      scoreResult: scoreResult
    };
  } catch (error) {
    return createErrorResponse(
      'FOOD_SESSION_CREATION_ERROR',
      'Failed to create food session',
      error,
      { userId }
    );
  }
}

async function getDailyFoodScore(userId, date) {
  try {
    // Validate inputs
    if (!userId) {
      return createErrorResponse(
        'INVALID_USER_ID',
        'User ID is required',
        'Missing userId parameter'
      );
    }

    if (!date) {
      return createErrorResponse(
        'INVALID_DATE',
        'Date is required in YYYY-MM-DD format',
        'Missing date parameter'
      );
    }

    // First check if food score exists in health metrics
  const healthMetric = await HealthMetricsService.getHealthMetric(userId, date);
  
  // Use the timezone utility to get current date in IST
  const currentDate = timezoneUtils.getCurrentISTDate();
  date = timezoneUtils.formatISTDate(new Date(date));

    // If score exists and it's not today's date, return the cached score
  if (healthMetric?.food_score !== null &&
    healthMetric?.food_score !== "null" &&
    !isNaN(healthMetric?.food_score) &&
    date !== currentDate) {
      info("Returning cached food score");
      return { 
        success: true,
        food_score: healthMetric.food_score 
      };
  }

    // Otherwise, calculate fresh score
  const [year, month, day] = date.split("-").map(Number);
    if (!year || !month || !day) {
      return createErrorResponse(
        'INVALID_DATE_FORMAT',
        'Invalid date format. Please use YYYY-MM-DD format',
        `Invalid date components: year=${year}, month=${month}, day=${day}`,
        { date }
      );
  }

    // Get daily food session
    const foodSession = await foodRepository.fetchDailyFoodData(
    userId,
    year,
    month,
    day
  );

    if (!foodSession) {
      return { 
        success: true,
        message: "No food data found" 
      };
  }
    const session = foodSession;
    // Get user profile data for age, weight, etc.
    const userProfile = await userProfileService.getProfile(userId);
    if (!userProfile) {
      return createErrorResponse(
        'USER_NOT_FOUND',
        'User profile not found',
        null,
        { userId }
      );
    }

    // Pull out user data and calculate values
    const { 
      age, 
      weight_kg: weight, 
      height_cm: height, 
      gender 
    } = userProfile;

    if (!age || !weight || !height) {
      return createErrorResponse(
        'INCOMPLETE_USER_PROFILE',
        'User profile data is incomplete',
        null,
        { 
          userId,
          missingFields: [
            !age ? 'age' : null,
            !weight ? 'weight_kg' : null,
            !height ? 'height_cm' : null
          ].filter(Boolean)
        }
      );
    }
    const bmr = calculateBMR(weight, height, age, gender);
  const activityMetrics = await activityService.getDailyActivityScore(
    userId,
    date
  );
  const lastActivityData = await activityService.getLastActivityHours(
    userId,
    year,
    month,
    day
  );

  const mealGroups = {}; // Group food items by meal type
  for (const item of session.foodItems) {
    const mealType = item.mealType || "unspecified";
    if (!mealGroups[mealType]) mealGroups[mealType] = [];
    mealGroups[mealType].push(item);
  }

  const personalDataBase = {
    weightKg: Number(weight),
    heightCm: Number(height),
    ageYears: Number(age),
    gender,
    caloriesBurned: Number(activityMetrics?.caloriesBurned || 0),
    fastingGlucose: 90,
    sleepHours: Number(healthMetric?.sleep_hours || 7.5),
  };

  const activityData = {
    BMR: Number(bmr),
    activityScore: Number(activityMetrics?.activity_score || 50),
    lastActivityHours: Number(lastActivityData?.hoursSinceLastActivity || 5),
  };

  const scores = {};
  const nutritionTaken = [];

  for (const [mealType, items] of Object.entries(mealGroups)) {
    let totals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      fiber: 0,
      sugar: 0,
      gi: 0,
      gl: 0,
      giCount: 0,
      glCount: 0,
    };

    items.forEach((item) => {
      const macro = item.macronutrients || {};
      totals.calories += macro.energy_kcal || 0;
      totals.protein += macro.protein_g || 0;
      totals.carbs += macro.carbohydrates_g || 0;
      totals.fats += macro.fat_g || 0;
      totals.fiber += macro.fiber_g || 0;
      totals.sugar += macro.sugar_g || 0;

      if (item.gi != null) {
        totals.gi += item.gi;
        totals.giCount++;
      }
      if (item.gl != null) {
        totals.gl += item.gl;
        totals.glCount++;
      }
    });

    const foodData = {
      carbGrams: totals.carbs,
      sugarGrams: totals.sugar,
      fiber: totals.fiber,
      proteinGrams: totals.protein,
      fatGrams: totals.fats,
      GI: totals.giCount > 0 ? totals.gi / totals.giCount : 55,
      GL: totals.glCount > 0 ? totals.gl / totals.glCount : 10,
    };

    const { foodScore } = calculateFoodScore(
      foodData,
      personalDataBase,
      activityData
    );
    scores[mealType] = foodScore;

    nutritionTaken.push({ mealType, ...totals });
  }

  const allMealScores = Object.values(scores);
  const averageScore =
    allMealScores.reduce((sum, val) => sum + val, 0) / allMealScores.length;

  await HealthMetricsService.updateHealthMetricByDate(
    year,
    month,
    day,
    userId,
    {
      food_score: averageScore,
      food_score_array: healthMetric?.food_score_array
        ? [...healthMetric.food_score_array, averageScore]
        : [averageScore],
      nutrition_taken: healthMetric?.nutrition_taken
        ? [...healthMetric.nutrition_taken, ...nutritionTaken]
        : nutritionTaken,
    }
  );
  console.log("Updated health metric with food score:", scores);
  // Store meal-wise scores in session's `scores` field
  await foodRepository.updateSessionScores(session.id, scores);

  return { food_score: averageScore };
} catch (error) {
    return createErrorResponse(
      'FOOD_SCORE_CALCULATION_ERROR',
      'Failed to calculate food score',
      error,
      { userId, date }
    );
  }
}

async function getMonthlyFoodScore(userId, year, month) {
  const monthlyHealthMetric =
    await MonthlyHealthMetricService.getHealthMetricForMonth(
      userId,
      year,
      month,
      true
    );

  const currentDate = timezoneUtils.getCurrentIST();
  const istDate = currentDate;

  const isCurrentMonth =
    Number(year) === istDate.getFullYear() &&
    Number(month) === istDate.getMonth() + 1;

  let needsRefresh = false;

  if (isCurrentMonth) {
    needsRefresh = true;
  } else if (monthlyHealthMetric?.monthly_food_data) {
    const lastFoodSession = await foodRepository.getLastFoodSessionForMonth(
      userId,
      year,
      month
    );
    needsRefresh =
      lastFoodSession &&
      new Date(lastFoodSession.created_at) >
        new Date(monthlyHealthMetric.monthly_food_data.lastUpdated);
  }

  if (monthlyHealthMetric?.monthly_food_score != null && !needsRefresh) {
    info("Returning cached monthly food score:");
    return { monthly_food_score: monthlyHealthMetric.monthly_food_score };
  }

  const foodSessions = await foodRepository.fetchFoodSessionsForMonth(
    userId,
    year,
    month
  );

  const allDayScores = [];

  for (const session of foodSessions) {
    const dateInfo = await foodRepository.getDateByDayId(session.dayId);
    if (!dateInfo) continue;

    const { formattedDate } = dateInfo;
    const isToday = formattedDate === timezoneUtils.getCurrentISTDate();

    let score;

    // Try to grab average of scores from FoodSession.scores if present
    if (session.scores && Object.keys(session.scores).length > 0) {
      const mealScores = Object.values(session.scores);
      score = mealScores.reduce((sum, val) => sum + val, 0) / mealScores.length;
    } else {
      // Fallback to recalculating score for today or missing days
      const result = await getDailyFoodScore(userId, formattedDate);
      score = result?.food_score ?? null;
    }

    if (score !== null) {
      allDayScores.push(score);
    }
  }

  if (!allDayScores.length) {
    return { message: "No valid food scores found for this month" };
  }

  const avgScore =
    allDayScores.reduce((sum, val) => sum + val, 0) / allDayScores.length;

  await MonthlyHealthMetricService.updateHealthMetricForMonth(
    userId,
    year,
    month,
    {
      monthly_food_score: avgScore,
    }
  );

  return { monthly_food_score: avgScore };
}

async function getMetabolicScore(userId, date) {
  try {
    // Parse date to get year, month, day
    const [year, month, day] = date.split("-").map(Number);
    if (!year || !month || !day) {
      throw new Error("Invalid date format. Please use 'YYYY-MM-DD'.");
    }

    // Check if metabolic score already exists
    const healthMetric = await HealthMetricsService.getHealthMetric(
      userId,
      date
    );

    // If score exists and it's not today's date, return the cached score
    const currentDate = timezoneUtils.getCurrentISTDate();
    date = timezoneUtils.formatISTDate(new Date(date));

    if (healthMetric?.metabolic_score != null && date !== currentDate) {
      return { metabolic_score: healthMetric.metabolic_score };
    }

    // Get user profile data
    const userData = await userProfileService.getProfile(userId);
    if (!userData) {
      return { message: "User not found" };
    }

    const { age, weight_kg, height_cm, gender } = userData;
    if (!age || !weight_kg || !height_cm) {
      return { message: "User profile data is incomplete" };
    }

    // Get food session for the day with food items
    const foodSession = await foodRepository.fetchDailyFoodData(
      userId,
      year,
      month,
      day
    );

    if (!foodSession || !foodSession.foodItems || foodSession.foodItems.length === 0) {
      return { message: "No food data found" };
    }

    // Calculate totals from food items
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFats = 0;
    let totalCalories = 0;

    foodSession.foodItems.forEach((item) => {
      const macros = item.macronutrients || {};
      totalProtein += macros.protein_g || 0;
      totalCarbs += macros.carbohydrates_g || 0;
      totalFats += macros.fat_g || 0;
      totalCalories += macros.energy_kcal || 0;
    });

    // Get heart data to check if user has a smartwatch
    const dayId = await foodRepository.getOrCreateDayId(year, month, day);
    let heartData = null;
    if (userData.hasWatch) {
      heartData = await HealthMetricsService.getOrCreateHeartData(
        userId,
        date
      );
    }

    // Get sleep data from health metrics
    const sleepHours = healthMetric?.sleep_hours || 7.5;

    let metabolicScore;

    if (heartData && heartData.hrv) {
      // User has a smartwatch - use the watch method
      const caloriesBurned = healthMetric?.total_calories_burnt || 2000; // Default if not available
      const hrv = heartData.hrv;

      metabolicScore = calculateMetabolicScoreWithWatch(
        caloriesBurned,
        totalProtein,
        totalCarbs,
        totalFats,
        0, // Fasting glucose set to 0 as default since it's likely not available
        hrv,
        sleepHours
      );
    } else {
      // User doesn't have a smartwatch - use the non-watch method
      const bmr = calculateBMR(weight_kg, height_cm, age, gender);
      const caloriesBurned = healthMetric?.total_calories_burnt || 500; // Default activity calories

      metabolicScore = calculateMetabolicScoreWithoutWatch(
        weight_kg,
        height_cm,
        age,
        gender,
        totalProtein,
        totalCarbs,
        totalFats,
        caloriesBurned,
        90, // Fasting glucose set to 90 as default
        sleepHours
      );
    }

    // Update health metrics with the new score
    await HealthMetricsService.updateHealthMetricByDate(
      year,
      month,
      day,
      userId,
      {
        metabolic_score: metabolicScore,
      }
    );

    return { metabolic_score: metabolicScore };
  } catch (error) {
    errorLog("Error calculating metabolic score:", error);
    throw error;
  }
}

module.exports = {
  getDailyFoodData,
  getMonthlyFoodData,
  getFoodDataRange,
  postFoodSession,
  getDailyFoodScore,
  getMonthlyFoodScore,
  getMetabolicScore,
};
