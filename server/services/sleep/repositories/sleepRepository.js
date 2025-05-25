const { Op, Sequelize } = require("sequelize");
const {
  SleepSession,
  SleepStage,
  Day,
  Month,
  Year,
} = require("@dtwin/shared-database");

const getOrCreateDayId = async (year, month, day) => {
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
    if (error.name === "SequelizeUniqueConstraintError") {
      // If we hit a unique constraint, try to find the existing day
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
      throw error; // Re-throw if we can't recover
    }
    throw error;
  }
};
const fetchDailySleepData = async (userId, dayId) => {
  return await SleepSession.findOne({
    where: { userId, dayId },
    include: { model: SleepStage, as: "stages" },
  });
};

const fetchMonthlySleepData = async (userId, year, month) => {
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

  return await SleepSession.findAll({
    where: {
      userId,
      dayId: { [Op.in]: dayIds },
    },
    include: { model: SleepStage, as: "stages" },
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

const fetchSleepSessionsByRange = async (
  userId,
  startDate,
  endDate,
  stageType,
  minDuration,
  maxDuration
) => {
  return await SleepSession.findAll({
    where: {
      userId,
      startTime: { [Op.between]: [new Date(startDate), new Date(endDate)] },
      ...(minDuration !== null && maxDuration !== null
        ? {
            durationSeconds: {
              [Op.gte]: minDuration * 3600, // Convert hours to seconds
              [Op.lte]: maxDuration * 3600,
            },
          }
        : {}),
    },
    include: {
      model: SleepStage,
      as: "stages",
      where: stageType
        ? Sequelize.where(
            Sequelize.cast(Sequelize.col("stages.stageType"), "text"),
            { [Op.iLike]: stageType }
          )
        : undefined,
      required: false,
    },
    attributes: ["startTime", "endTime", "durationSeconds", "efficiencyScore"],
  });
};

const findBestSleepStage = async (userId, date) => {
  const stages = await SleepStage.findAll({
    where: {
      userId,
      startTime: {
        [Op.between]: [
          new Date(`${date}T00:00:00.000Z`),
          new Date(`${date}T23:59:59.999Z`),
        ],
      },
    },
    order: [["durationSeconds", "DESC"]],
    limit: 1, // Only need the best stage for the day
  });

  return stages.length
    ? {
        stageType: stages[0].stageType,
        durationSeconds: stages[0].durationSeconds,
        startTime: stages[0].startTime,
        endTime: stages[0].endTime,
      }
    : null;
};

const createSleepSession = async (
  userId,
  year,
  month,
  day,
  sleepSession,
  sleepStages
) => {
  const dayId = await getOrCreateDayId(year, month, day);

  // Create Sleep Session with the Day ID
  const session = await SleepSession.create({ userId, dayId, ...sleepSession });

  // Create Sleep Stages linked to the Session
  for (const stage of sleepStages) {
    await SleepStage.create({ sessionId: session.id, userId, ...stage });
  }
  return session;
};

const fetchSleepRecommendations = async (userId) => {
  return [
    "Avoid caffeine before sleep",
    "Maintain a consistent sleep schedule",
  ];
};

const fetchSleepSessionByDate = async (userId, year, month, day) => {
  const dayId = await getOrCreateDayId(year, month, day);
  return await fetchDailySleepData(userId, dayId);
};

const fetchSleepSessionsForMonth = async (userId, year, month) => {
  return await fetchMonthlySleepData(userId, year, month);
};

// In your sleepRepository.js (add this to the exports too)
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

const getLastSleepSessionForMonth = async (userId, year, month) => {
  // Handle case where month or year might be undefined
  if (!userId || !year || !month) {
    return null;
  }
  
  try {
    
    return await SleepSession.findOne({
      where: {
        userId,
        [Op.and]: [
          Sequelize.where(
            Sequelize.fn('date_part', 'year', Sequelize.col('startTime')),
            year
          ),
          Sequelize.where(
            Sequelize.fn('date_part', 'month', Sequelize.col('startTime')),
            month
          )
        ]
      },
      order: [['createdAt', 'DESC']],
      limit: 1
    });
  } catch (error) {
    // Log the error and return null instead of crashing
    console.error('Error in getLastSleepSessionForMonth:', error.message);
    return null;
  }
};

const deleteSleepSession = async (sessionId) => {
  // First delete all sleep stages associated with this session
  await SleepStage.destroy({
    where: { sessionId }
  });
  
  // Then delete the sleep session itself
  return await SleepSession.destroy({
    where: { id: sessionId }
  });
};

module.exports = {
  getOrCreateDayId,
  fetchDailySleepData,
  fetchMonthlySleepData,
  fetchMonthDayIDs,
  fetchSleepSessionsByRange,
  findBestSleepStage,
  createSleepSession,
  fetchSleepRecommendations,
  fetchSleepSessionByDate,
  fetchSleepSessionsForMonth,
  getDateByDayId,
  getLastSleepSessionForMonth,
  deleteSleepSession
};
