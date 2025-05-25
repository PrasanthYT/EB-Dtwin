const { Op } = require("sequelize");
const {
  sequelize: Sequelize,
  FoodSession,
  Day,
  Month,
  Year,
  FoodItem,
} = require("@dtwin/shared-database");
const timezoneUtils = require("../../../common/utils/timezone");
const { errorLog } = require("@dtwin/config");

const getOrCreateDayId = async (year, month, day) => {
  try {
    const foundDay = await Day.findOne({
      where: { day },
      include: [
        {
          model: Month,
          where: { month },
          required: true,
          include: [
            {
              model: Year,
              where: { year },
              required: true,
            },
          ],
        },
      ],
    });

    if (foundDay) return foundDay.id;

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

    const existingDay = await Day.findOne({
      where: {
        day,
        monthId: monthRecord.id,
      },
    });

    if (existingDay) return existingDay.id;

    const newDay = await Day.create({
      day,
      monthId: monthRecord.id,
    });
    return newDay.id;
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      const existingDay = await Day.findOne({
        where: {
          day,
          monthId:
            error.fields.monthId ||
            (
              await Month.findOne({
                where: {
                  month,
                  yearId: await Year.findOne({ where: { year } }).then(
                    (y) => y.id
                  ),
                },
              })
            ).id,
        },
      });
      if (existingDay) return existingDay.id;
      throw error;
    }
    throw error;
  }
};

const fetchDailyFoodData = async (userId, year, month, day) => {
  const dayId = await getOrCreateDayId(year, month, day);

  return await FoodSession.findOne({
    where: { userId, dayId },
    include: [
      {
        model: FoodItem,
        as: "foodItems",
        attributes: [
          "id",
          "foodName",
          "mealType",
          "imageUrl",
          "createdAt",
          "macronutrients",
        ],
        order: [["createdAt", "ASC"]],
      },
    ],
    order: [["sessionTime", "ASC"]],
  });
};

const getDayIdsInRange = async (startDate, endDate) => {
  // Convert dates to IST before processing
  const start = timezoneUtils.toIST(new Date(startDate));
  const end = timezoneUtils.toIST(new Date(endDate));

  const dateList = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dateList.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
    });
  }

  const orConditions = dateList.map(({ year, month, day }) => ({
    [Op.and]: [
      { day },
      { "$Month.month$": month },
      { "$Month.Year.year$": year },
    ],
  }));

  const days = await Day.findAll({
    include: [
      {
        model: Month,
        include: [
          {
            model: Year,
          },
        ],
      },
    ],
    where: {
      [Op.or]: orConditions,
    },
    attributes: ["id"],
  });

  return days.map((day) => day.id);
};

const fetchFilteredFoodSessions = async (
  userId,
  startDate,
  endDate,
  filters = {},
  transaction = null
) => {
  try {
    // Get all day IDs in the range
    const dayIds = await getDayIdsInRange(startDate, endDate);
    if (!dayIds.length) {
      return [];
    }

    // Base query options
    const options = {
      where: {
        userId,
        dayId: { [Op.in]: dayIds },
        // Apply totalCalories filter at session level
        ...(filters.minCalories !== undefined &&
        filters.maxCalories !== undefined
          ? {
              totalCalories: {
                [Op.between]: [filters.minCalories, filters.maxCalories],
              },
            }
          : {}),
      },
      include: [
        {
          model: FoodItem,
          as: "foodItems",
          attributes: [
            "id",
            "foodName",
            "mealType",
            "imageUrl",
            "createdAt",
            "macronutrients",
          ],
          // Apply mealType filter at item level
          ...(filters.mealType
            ? { where: { mealType: filters.mealType } }
            : {}),
          order: [["createdAt", "ASC"]],
        },
        {
          model: Day,
          include: [
            {
              model: Month,
              include: [
                {
                  model: Year,
                },
              ],
            },
          ],
        },
      ],
      order: [
        [Day, Month, Year, "year", "ASC"],
        [Day, Month, "month", "ASC"],
        [Day, "day", "ASC"],
        ["sessionTime", "ASC"],
      ],
      transaction,
    };

    const sessions = await FoodSession.findAll(options);

    // Map sessions and calculate filtered totals
    return sessions.map((session) => {
      const day = session.Day;
      const month = day.Month;
      const year = month.Year;

      // Calculate totals based only on filtered items (if mealType filter applied)
      let filteredCalories = 0;
      let filteredProtein = 0;
      let filteredCarbs = 0;
      let filteredFats = 0;

      session.foodItems.forEach((item) => {
        filteredCalories += item.macronutrients?.energy_kcal || 0;
        filteredProtein += item.macronutrients?.protein_g || 0;
        filteredCarbs += item.macronutrients?.carbohydrates_g || 0;
        filteredFats += item.macronutrients?.fat_g || 0;
      });

      return {
        ...session.get({ plain: true }),
        date: `${year.year}-${String(month.month).padStart(2, "0")}-${String(
          day.day
        ).padStart(2, "0")}`,
        year: year.year,
        month: month.month,
        day: day.day,
        // Override totals with filtered values
        totalCalories: filteredCalories,
        totalProtein: filteredProtein,
        totalCarbs: filteredCarbs,
        totalFats: filteredFats,
      };
    });
  } catch (error) {
    errorLog("Error in fetchFilteredFoodSessions:", error);
    throw error;
  }
};

const getOrCreateFoodSession = async (userId, year, month, day) => {
  const dayId = await getOrCreateDayId(year, month, day);

  // Find existing session for this user and day
  const existingSession = await FoodSession.findOne({
    where: {
      userId,
      dayId,
    },
  });

  if (existingSession) {
    return existingSession;
  }

  // Create new session with default values
  return await FoodSession.create({
    userId,
    dayId,
    sessionTime: timezoneUtils.getCurrentIST(), // Use timezone utility for consistent IST handling
    mealType: "unspecified", // Default meal type
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFats: 0,
  });
};

const createFoodItem = async (sessionId, foodItemData) => {
  return await FoodItem.create({
    sessionId,
    foodName: foodItemData.foodName,
    servingSize: foodItemData.serving_size,
    servingAmount: foodItemData.serving_amount,
    macronutrients: foodItemData.macronutrients,
    micronutrients: foodItemData.micronutrients,
    imageUrl: foodItemData.image_url,
    gi: foodItemData.gi,
    gl: foodItemData.gl,
    source: foodItemData.source,
    mealType: foodItemData.mealType,
  });
};

const updateSessionTotals = async (sessionId) => {
  // First approach: Using raw SQL for JSONB field access
  const result = await Sequelize.query(
    `SELECT 
      SUM((macronutrients->>'energy_kcal')::FLOAT) as "totalCalories",
      SUM((macronutrients->>'protein_g')::FLOAT) as "totalProtein",
      SUM((macronutrients->>'carbohydrates_g')::FLOAT) as "totalCarbs",
      SUM((macronutrients->>'fat_g')::FLOAT) as "totalFats"
    FROM food_items
    WHERE "sessionId" = :sessionId`,
    {
      replacements: { sessionId },
      type: Sequelize.QueryTypes.SELECT,
    }
  );

  const totals = result[0] || {
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFats: 0,
  };

  await FoodSession.update(
    {
      totalCalories: totals.totalCalories || 0,
      totalProtein: totals.totalProtein || 0,
      totalCarbs: totals.totalCarbs || 0,
      totalFats: totals.totalFats || 0,
    },
    { where: { id: sessionId } }
  );

  return true;
};

const getLastFoodSessionForMonth = async (userId, year, month) => {
  return await FoodSession.findOne({
    where: {
      userId,
      [Op.and]: [
        Sequelize.where(
          Sequelize.fn("date_part", "year", Sequelize.col("sessionTime")),
          year
        ),
        Sequelize.where(
          Sequelize.fn("date_part", "month", Sequelize.col("sessionTime")),
          month
        ),
      ],
    },
    order: [["createdAt", "DESC"]],
    limit: 1,
  });
};

const fetchFoodSessionsForMonth = async (userId, year, month) => {
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

  return await FoodSession.findAll({
    where: {
      userId,
      dayId: { [Op.in]: dayIds },
    },
  });
};

const fetchMonthDayIDs = async (year, month) => {
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

  return days.map((day) => day.id);
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

const updateSessionScores = async (sessionId, scores) => {
  return await FoodSession.update({ scores }, { where: { id: sessionId } });
};

module.exports = {
  getOrCreateDayId,
  fetchDailyFoodData,
  fetchFilteredFoodSessions,
  getOrCreateFoodSession,
  createFoodItem,
  updateSessionTotals,
  getLastFoodSessionForMonth,
  fetchFoodSessionsForMonth,
  fetchMonthDayIDs,
  getDateByDayId,
  updateSessionScores,
};
