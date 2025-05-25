// exercisePlanRepository.js
const { ExercisePlan, Day, Month, Year } = require("@dtwin/shared-database");
const { Op } = require("sequelize");
const { info, errorLog } = require("@dtwin/config");

/**
 * Get or create day ID for a specific date
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {string} Day ID
 */
const getOrCreateDayId = async (dateStr) => {
  const [year, month, day] = dateStr.split("-").map(Number);

  try {
    // First try to find the day with proper associations
    const foundDay = await Day.findOne({
      where: { day },
      include: [
        {
          model: Month,
          where: { month },
          include: [
            {
              model: Year,
              where: { year },
            },
          ],
        },
      ],
    });

    if (foundDay) return foundDay.id;

    // If not found, find or create the year and month first
    const [yearRecord] = await Year.findOrCreate({
      where: { year },
      defaults: { year },
    });

    const [monthRecord] = await Month.findOrCreate({
      where: {
        month,
        yearId: yearRecord.id,
      },
      defaults: {
        month,
        yearId: yearRecord.id,
      },
    });

    // Try to find the day again in case it was created by another request
    const existingDay = await Day.findOne({
      where: {
        day,
        monthId: monthRecord.id,
      },
    });

    if (existingDay) return existingDay.id;

    // If still not found, create the day
    const newDay = await Day.create({
      day,
      monthId: monthRecord.id,
    });

    return newDay.id;
  } catch (error) {
    errorLog(`Error in getOrCreateDayId for date ${dateStr}:`, error);
    throw error;
  }
};

/**
 * Save exercise plan for a specific date
 * @param {string} userId - User ID
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @param {Object} plan - Exercise plan data
 * @returns {Object} Saved exercise plan
 */
const saveExercisePlanForDate = async (userId, dateStr, plan) => {
  try {
    const dayId = await getOrCreateDayId(dateStr);

    // Check if plan already exists
    const existingPlan = await ExercisePlan.findOne({
      where: {
        userId,
        dayId,
      },
    });

    if (existingPlan) {
      // Update existing plan
      await existingPlan.update({
        workouts: plan,
      });

      return existingPlan;
    } else {
      // Create new plan
      return await ExercisePlan.create({
        userId,
        dayId,
        date: dateStr,
        workouts: plan,
      });
    }
  } catch (error) {
    errorLog(
      `Error in saveExercisePlanForDate for user ${userId} and date ${dateStr}:`,
      error
    );
    throw error;
  }
};

/**
 * Update exercise plan for a specific date
 * @param {string} userId - User ID
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @param {Object} plan - Updated exercise plan data
 * @returns {Object} Updated exercise plan
 */
const updateExercisePlanForDate = async (userId, dateStr, plan) => {
  try {
    const dayId = await getOrCreateDayId(dateStr);

    const [updated] = await ExercisePlan.update(
      { workouts: plan },
      {
        where: {
          userId,
          dayId,
        },
        returning: true,
      }
    );

    if (updated === 0) {
      throw new Error(
        `Exercise plan not found for user ${userId} on date ${dateStr}`
      );
    }

    return await ExercisePlan.findOne({
      where: {
        userId,
        dayId,
      },
    });
  } catch (error) {
    errorLog(
      `Error in updateExercisePlanForDate for user ${userId} and date ${dateStr}:`,
      error
    );
    throw error;
  }
};

/**
 * Get exercise plan for a specific date
 * @param {string} userId - User ID
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {Object|null} Exercise plan or null if not found
 */
const getExercisePlanForDate = async (userId, dateStr) => {
  try {
    const dayId = await getOrCreateDayId(dateStr);

    const plan = await ExercisePlan.findOne({
      where: {
        userId,
        dayId,
      },
    });

    return plan ? plan.workouts : null;
  } catch (error) {
    errorLog(
      `Error in getExercisePlanForDate for user ${userId} and date ${dateStr}:`,
      error
    );
    throw error;
  }
};

/**
 * Delete exercise plan for a specific date
 * @param {string} userId - User ID
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {number} Number of deleted records
 */
const deleteExercisePlanForDate = async (userId, dateStr) => {
  try {
    const dayId = await getOrCreateDayId(dateStr);

    const deleted = await ExercisePlan.destroy({
      where: {
        userId,
        dayId,
      },
    });

    info(
      `Deleted ${deleted} exercise plan(s) for user ${userId} on date ${dateStr}`
    );

    return deleted;
  } catch (error) {
    errorLog(
      `Error in deleteExercisePlanForDate for user ${userId} and date ${dateStr}:`,
      error
    );
    throw error;
  }
};

/**
 * Find missing exercise plan dates
 * @param {string} userId - User ID
 * @param {Array<string>} dates - Array of dates in YYYY-MM-DD format
 * @returns {Array<string>} Array of missing dates
 */
const findMissingDates = async (userId, dates) => {
  try {
    // Get all day IDs for the dates
    const dayIds = [];
    for (const dateStr of dates) {
      const dayId = await getOrCreateDayId(dateStr);
      dayIds.push(dayId);
    }

    // Find existing plans
    const existingPlans = await ExercisePlan.findAll({
      where: {
        userId,
        dayId: {
          [Op.in]: dayIds,
        },
      },
      attributes: ["dayId"],
    });

    // Get existing day IDs
    const existingDayIds = existingPlans.map((plan) => plan.dayId);

    // Find missing day IDs
    const missingDayIds = dayIds.filter(
      (dayId) => !existingDayIds.includes(dayId)
    );

    // Convert missing day IDs back to dates
    const missingDates = [];
    for (let i = 0; i < dayIds.length; i++) {
      if (missingDayIds.includes(dayIds[i])) {
        missingDates.push(dates[i]);
      }
    }

    return missingDates;
  } catch (error) {
    errorLog(`Error in findMissingDates for user ${userId}:`, error);
    throw error;
  }
};

module.exports = {
  saveExercisePlanForDate,
  updateExercisePlanForDate,
  getExercisePlanForDate,
  deleteExercisePlanForDate,
  findMissingDates,
};
