const exercisePlanRepository = require("./repositories/exercisePlanRepository");
const profileRepository = require("../user/repositories/userProfileRepository");
const geminiExerciseService = require("./geminiExerciseService");
const axios = require('axios');
const { info, errorLog } = require("@dtwin/config");
const timezoneUtils = require("../../common/utils/timezone");

/**
 * Generate an exercise plan for a specific date
 */
const generateExercisePlanForDate = async (userId, date) => {
  try {
    info(`Generating exercise plan for user ${userId} on date ${date}`);

    const profile = await profileRepository.findById(userId);
    if (!profile) throw new Error(`User profile not found for user ${userId}`);

    const exercisePlan = await geminiExerciseService.generateExercisePlan({
      userId,
      ...profile.dataValues
    });

    info(`Saving exercise plan for user ${userId} on date ${date}`);
    await exercisePlanRepository.saveExercisePlanForDate(userId, date, exercisePlan);

    return exercisePlan;
  } catch (error) {
    errorLog(`Failed to generate exercise plan for user ${userId} on date ${date}:`, error);
    throw error;
  }
};

/**
 * Get exercise plan for a specific date
 * @param {string} userId - User ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Object} Exercise plan for the date
 */
const getExercisePlanForDate = async (userId, date) => {
  try {
    let plan = await exercisePlanRepository.getExercisePlanForDate(userId, date);

    if (!plan) {
      info(`No exercise plan found for user ${userId} on date ${date}, generating new plan`);
      plan = await generateExercisePlanForDate(userId, date);
    }

    return {
      workout: plan.workouts.length > 0 ? plan.workouts[0] : null,
    };
  } catch (error) {
    errorLog(`Failed to get exercise plan for user ${userId} on date ${date}:`, error);
    throw error;
  }
};


/**
 * Regenerate a workout for a specific date
 * @param {string} userId - User ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Object} Regenerated workout
 */
const regenerateWorkout = async (userId, date) => {
  try {
    // Get current plan
    const plan = await exercisePlanRepository.getExercisePlanForDate(
      userId,
      date
    );

    if (!plan) {
      throw new Error(
        `No exercise plan exists for user ${userId} on date ${date}`
      );
    }

    // Get the current workout options
    const workoutOptions = plan.workouts;

    if (!workoutOptions || workoutOptions.length === 0) {
      throw new Error(
        `No workout options found for user ${userId} on date ${date}`
      );
    }

    // Store the disliked workout in user profile
    const dislikedWorkout = workoutOptions[0];
    await updateDislikedExercises(userId, dislikedWorkout);

    // If we have more than one option, rotate them
    if (workoutOptions.length > 1) {
      // Remove the first workout and put it at the end
      const [currentWorkout, ...remainingWorkouts] = workoutOptions;
      plan.workouts = [...remainingWorkouts, currentWorkout];

      // Save the updated plan
      await exercisePlanRepository.updateExercisePlanForDate(
        userId,
        date,
        plan
      );

      // Return the new top workout
      return remainingWorkouts[0];
    } else {
      // We need to generate more options
      info(`Generating more workout options for user ${userId}`);

      // Get user profile
      const profile = await profileRepository.findById(userId);

      // Prepare data for ML
      const mlData = {
        user_data: {
          bmi: calculateBMI(profile.weight_kg, profile.height_cm),
          health_goals: profile.health_goals,
          health_score: profile.health_score,
          medical_conditions: profile.medical_conditions,
        },
        preferences: profile.exercise_preferences,
        disliked_exercises: profile.disliked_exercises || [],
      };

      // Call ML service to generate more workout options
      const newWorkoutOptions = await exerciseMLService.generateWorkoutOptions(
        mlData,
        5
      );

      // Add scores to new options
      const scoredOptions = newWorkoutOptions.map((workout, index) => ({
        ...workout,
        score: 95 - index * 10, // Slightly lower than original top score
      }));

      // Update the plan with new options
      plan.workouts = [...scoredOptions, dislikedWorkout];
      await exercisePlanRepository.updateExercisePlanForDate(
        userId,
        date,
        plan
      );

      // Return the new top workout
      return scoredOptions[0];
    }
  } catch (error) {
    errorLog(
      `Failed to regenerate workout for user ${userId} on date ${date}:`,
      error
    );
    throw error;
  }
};

/**
 * Update disliked exercises in user profile
 * @param {string} userId - User ID
 * @param {Object} workout - Disliked workout
 */
const updateDislikedExercises = async (userId, workout) => {
  try {
    // Get user profile
    const profile = await profileRepository.findById(userId);

    // Initialize disliked_exercises if it doesn't exist
    let dislikedExercises = profile.disliked_exercises || [];

    // Add the new disliked workout
    dislikedExercises.push({
      name: workout.name,
      timestamp: new Date().toISOString(),
    });

    // Keep only the latest 30 disliked exercises
    if (dislikedExercises.length > 30) {
      dislikedExercises = dislikedExercises.slice(-30);
    }

    // Update the profile
    await profileRepository.updateProfile(userId, {
      disliked_exercises: dislikedExercises,
    });

    info(
      `Updated disliked exercises for user ${userId}, now has ${dislikedExercises.length} disliked exercises`
    );
  } catch (error) {
    errorLog(`Failed to update disliked exercises for user ${userId}:`, error);
  }
};

/**
 * Update exercise preferences
 * @param {string} userId - User ID
 * @param {Object} preferences - Exercise preferences
 */
const updateExercisePreferences = async (userId, preferences) => {
  const profile = await profileRepository.findById(userId);
  if (!profile) throw new Error("User profile not found");

  const updatedPreferences = {
    ...profile.exercise_preferences,
    ...preferences,
  };

  await profileRepository.updateProfile(userId, {
    exercise_preferences: updatedPreferences,
  });

  // Clear plans for the next 7 days to force regeneration with new preferences
  const today = timezoneUtils.getCurrentIST();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];

    await exercisePlanRepository.deleteExercisePlanForDate(userId, dateStr);
  }
};

/**
 * Delete exercise plan for a specific date
 * @param {string} userId - User ID
 * @param {string} date - Date in YYYY-MM-DD format
 */
const deleteExercisePlanForDate = async (userId, date) => {
  return await exercisePlanRepository.deleteExercisePlanForDate(userId, date);
};

/**
 * Find missing exercise plan dates
 * @param {string} userId - User ID
 * @param {Array<string>} dates - Array of dates in YYYY-MM-DD format
 * @returns {Array<string>} Array of missing dates
 */
const findMissingDates = async (userId, dates) => {
  return await exercisePlanRepository.findMissingDates(userId, dates);
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
  generateExercisePlanForDate,
  getExercisePlanForDate,
  regenerateWorkout,
  updateExercisePreferences,
  deleteExercisePlanForDate,
  findMissingDates,
};
