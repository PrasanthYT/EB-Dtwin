const { ActivitySession, Day, Month, Year } = require("@dtwin/shared-database");
const { Op, Sequelize } = require("sequelize");
const { info } = require("@dtwin/config");
const getOrCreateDayId = async (year, month, day) => {
  const foundDay = await Day.findOne({
    where: { day },
    include: {
      model: Month,
      include: {
        model: Year,
        where: { year },
      },
      where: { month },
    },
  });

  if (foundDay) return foundDay.id;

  // If not found, create year → month → day chain
  const [yearRecord] = await Year.findOrCreate({ where: { year } });
  const [monthRecord] = await Month.findOrCreate({
    where: { month, yearId: yearRecord.id },
  });
  const newDay = await Day.create({ day, monthId: monthRecord.id });
  return newDay.id;
};

const fetchActivitiesByDate = async (userId, date) => {
  const [year, month, day] = date.split("-").map(Number);
  const dayId = await getOrCreateDayId(year, month, day);
  return await ActivitySession.findAll({ where: { userId, dayId } });
};

const fetchActivitiesByRange = async (
  userId,
  startDate,
  endDate,
  activityType,
  minTime,
  maxTime
) => {
  const whereClause = {
    userId,
  };

  if (activityType) {
    whereClause.activity_type = activityType;
  }

  const minTimeInSeconds = minTime ? minTime * 3600 : null;
  const maxTimeInSeconds = maxTime ? maxTime * 3600 : null;

  if (minTimeInSeconds && maxTimeInSeconds) {
    whereClause.duration_seconds = {
      [Op.between]: [minTimeInSeconds, maxTimeInSeconds],
    };
  } else if (minTimeInSeconds) {
    whereClause.duration_seconds = { [Op.gte]: minTimeInSeconds };
  } else if (maxTimeInSeconds) {
    whereClause.duration_seconds = { [Op.lte]: maxTimeInSeconds };
  }

  info(whereClause);

  return await ActivitySession.findAll({
    where: whereClause,
    include: {
      model: Day,
      include: {
        model: Month,
        include: {
          model: Year,
          where: {
            year: {
              [Op.between]: [startDate.split("-")[0], endDate.split("-")[0]],
            },
          },
        },
        where: {
          month: {
            [Op.between]: [startDate.split("-")[1], endDate.split("-")[1]],
          },
        },
      },
      where: {
        day: { [Op.between]: [startDate.split("-")[2], endDate.split("-")[2]] },
      },
    },
  });
};

const fetchActivitiesForMonth = async (userId, year, month) => {
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

  return await ActivitySession.findAll({
    where: {
      userId,
      dayId: { [Op.in]: dayIds },
    },
  });
};

const fetchActivityById = async (activityId) => {
  return await ActivitySession.findOne({ id: activityId });
};

const createActivity = async (userId, year, month, day, activityData) => {
  const dayId = await getOrCreateDayId(year, month, day);

  return await ActivitySession.create({ userId, dayId, ...activityData });
};

const getLastActivityForDay = async (userId, year, month, day) => {
  const dayId = await getOrCreateDayId(year, month, day);

  return await ActivitySession.findOne({
    where: {
      userId,
      dayId,
    },
    order: [["created_at", "DESC"]],
    limit: 1,
  });
};

const getLastActivityForMonth = async (userId, year, month) => {
  return await ActivitySession.findOne({
    where: {
      userId,
      [Op.and]: [
        Sequelize.where(
          Sequelize.fn("date_part", "year", Sequelize.col("start_time")),
          year
        ),
        Sequelize.where(
          Sequelize.fn("date_part", "month", Sequelize.col("start_time")),
          month
        ),
      ],
    },
    order: [["created_at", "DESC"]],
    limit: 1,
  });
};

const getDaysWithActivities = async (userId, year, month) => {
  const result = await ActivitySession.findAll({
    attributes: ["dayId"],
    where: {
      userId,
      [Op.and]: [
        Sequelize.where(
          Sequelize.fn("date_part", "year", Sequelize.col("start_time")),
          year
        ),
        Sequelize.where(
          Sequelize.fn("date_part", "month", Sequelize.col("start_time")),
          month
        ),
      ],
    },
    group: ["dayId"],
  });

  return result.map((item) => item.dayId);
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

module.exports = {
  fetchActivitiesByDate,
  fetchActivitiesForMonth,
  fetchActivityById,
  fetchActivitiesByRange,
  createActivity,
  getLastActivityForDay,
  getLastActivityForMonth,
  getDaysWithActivities,
  getDateByDayId,
  fetchMonthDayIDs,
};
