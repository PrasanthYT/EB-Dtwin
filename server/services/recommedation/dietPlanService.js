const dietPlanRepository = require("./repositories/dietPlanRepository");
const profileRepository = require("../user/repositories/userProfileRepository");
const { info, errorLog } = require("@dtwin/config");
const timezoneUtils = require("../../common/utils/timezone");
const geminiDietService = require("./geminiDietService");

// Remove the old generateDietPlanForDate and replace with this:
const generateDietPlanForDate = async (userId, date) => {
  try {
    info(`Generating diet plan for user ${userId} on date ${date}`);

    const profile = await profileRepository.findById(userId);
    if (!profile) throw new Error(`User profile not found for user ${userId}`);

    // Get diet plan from Gemini
    const dietPlan = await geminiDietService.generateDietPlan(profile);
    
    info(`Saving diet plan for user ${userId} on date ${date}`);
    await dietPlanRepository.saveDietPlanForDate(userId, date, dietPlan);

    return dietPlan;
  } catch (error) {
    errorLog(
      `Failed to generate diet plan for user ${userId} on date ${date}:`,
      error
    );
    throw error;
  }
};

/**
 * Get diet plan for a specific date
 * @param {string} userId - User ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Object} Diet plan for the date
 */
const getDietPlanForDate = async (userId, date) => {
  try {
    // Try to get existing plan
    let plan = await dietPlanRepository.getDietPlanForDate(userId, date);

    // If no plan exists, generate one
    if (!plan) {
      info(
        `No diet plan found for user ${userId} on date ${date}, generating new plan`
      );
      plan = await generateDietPlanForDate(userId, date);
    }

    // Return the highest scored meal for each type
    return {
      breakfast: plan.breakfast?.[0] || null,
      lunch: plan.lunch?.[0] || null,
      dinner: plan.dinner?.[0] || null,
      snacks: plan.snacks?.[0] || null,
    };
  } catch (error) {
    errorLog(
      `Failed to get diet plan for user ${userId} on date ${date}:`,
      error
    );
    throw error;
  }
};

/**
 * Regenerate a meal for a specific date and meal type
 * @param {string} userId - User ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} mealType - Meal type (breakfast, lunch, dinner, snacks)
 * @returns {Object} Regenerated meal
 */
const regenerateMeal = async (userId, date, mealType) => {
  try {
    // Get current plan
    const plan = await dietPlanRepository.getDietPlanForDate(userId, date);

    if (!plan) {
      throw new Error(`No diet plan exists for user ${userId} on date ${date}`);
    }

    // Get the current meal options
    const mealOptions = plan[mealType];

    if (!mealOptions || mealOptions.length === 0) {
      throw new Error(
        `No ${mealType} options found for user ${userId} on date ${date}`
      );
    }

    // Store the disliked meal in user profile
    const dislikedMeal = mealOptions[0];
    await updateDislikedMeals(userId, dislikedMeal);

    // If we have more than one option, rotate them
    if (mealOptions.length > 1) {
      const [currentMeal, ...remainingMeals] = mealOptions;
      plan[mealType] = [...remainingMeals, currentMeal];
      await dietPlanRepository.updateDietPlanForDate(userId, date, plan);
      return remainingMeals[0];
    } else {
      // Get user profile
      const profile = await profileRepository.findById(userId);

      // Generate new options with Gemini
      const newPlan = await geminiDietService.generateDietPlan(profile);
      const newMealOptions = newPlan[mealType];

      // Update the plan with new options
      plan[mealType] = [...newMealOptions, dislikedMeal];
      await dietPlanRepository.updateDietPlanForDate(userId, date, plan);

      // Return the new top meal
      return newMealOptions[0];
    }
  } catch (error) {
    errorLog(
      `Failed to regenerate ${mealType} for user ${userId} on date ${date}:`,
      error
    );
    throw error;
  }
};

/**
 * Update disliked meals in user profile
 * @param {string} userId - User ID
 * @param {Object} meal - Disliked meal
 */
const updateDislikedMeals = async (userId, meal) => {
  try {
    // Get user profile
    const profile = await profileRepository.findById(userId);

    // Initialize disliked_meals if it doesn't exist
    let dislikedMeals = profile.disliked_meals || [];

    // Add the new disliked meal
    dislikedMeals.push({
      name: meal.name,
      timestamp: new Date().toISOString(),
    });

    // Keep only the latest 30 disliked meals
    if (dislikedMeals.length > 30) {
      dislikedMeals = dislikedMeals.slice(-30);
    }

    // Update the profile
    await profileRepository.updateProfile(userId, {
      disliked_meals: dislikedMeals,
    });

    info(
      `Updated disliked meals for user ${userId}, now has ${dislikedMeals.length} disliked meals`
    );
  } catch (error) {
    errorLog(`Failed to update disliked meals for user ${userId}:`, error);
  }
};

/**
 * Update diet preferences
 * @param {string} userId - User ID
 * @param {Object} preferences - Diet preferences
 */
const updateDietPreferences = async (userId, preferences) => {
  const profile = await profileRepository.findById(userId);
  if (!profile) throw new Error("User profile not found");

  const updatedPreferences = {
    ...profile.diet_preferences,
    ...preferences,
  };

  await profileRepository.updateProfile(userId, {
    diet_preferences: updatedPreferences,
  });

  // Clear plans for the next 7 days to force regeneration with new preferences
  const today = timezoneUtils.getCurrentIST();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];

    await dietPlanRepository.deleteDietPlanForDate(userId, dateStr);
  }
};

/**
 * Delete diet plan for a specific date
 * @param {string} userId - User ID
 * @param {string} date - Date in YYYY-MM-DD format
 */
const deleteDietPlanForDate = async (userId, date) => {
  return await dietPlanRepository.deleteDietPlanForDate(userId, date);
};

/**
 * Find missing diet plan dates
 * @param {string} userId - User ID
 * @param {Array<string>} dates - Array of dates in YYYY-MM-DD format
 * @returns {Array<string>} Array of missing dates
 */
const findMissingDates = async (userId, dates) => {
  return await dietPlanRepository.findMissingDates(userId, dates);
};

/**
 * Calculate BMI
 * @param {number} weightKg - Weight in kg
 * @param {number} heightCm - Height in cm
 * @returns {number|null} BMI or null if inputs are invalid
 */
function calculateBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  const heightM = heightCm / 100;
  return (weightKg / (heightM * heightM)).toFixed(1);
}

module.exports = {
  generateDietPlanForDate,
  getDietPlanForDate,
  regenerateMeal,
  updateDietPreferences,
  deleteDietPlanForDate,
  findMissingDates,
};
