const cron = require("node-cron");
const dietPlanService = require("../services/recommedation/dietPlanService");
const exercisePlanService = require("../services/recommedation/exercisePlanService");
const { User } = require("@dtwin/shared-database");
const timezoneUtils = require("../common/utils/timezone");

/**
 * Daily Sliding-Window Scheduler
 * Runs every day at 12:00 PM to:
 * 1. Generate plans for day 7 (today + 6)
 * 2. Delete plans for day -1 (yesterday)
 */
const initDailySlidingWindowScheduler = () => {
  console.log("🔄 Initializing Daily Sliding-Window Scheduler");

  // Schedule job to run at 12:00 PM every day
  cron.schedule("0 12 * * *", async () => {
    console.log("🚀 Running Daily Sliding-Window Scheduler");

    try {
      // Get all users
      const users = await User.findAll({
        attributes: ["userId"],
      });

      console.log(`📊 Processing plans for ${users.length} users`);

      // Calculate dates
      const today = timezoneUtils.getCurrentIST();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const day7 = new Date(today);
      day7.setDate(day7.getDate() + 6);

      const yesterdayStr = yesterday.toISOString().split("T")[0];
      const day7Str = day7.toISOString().split("T")[0];

      console.log(
        `📅 Generating plans for ${day7Str} and removing plans for ${yesterdayStr}`
      );

      // Process each user
      for (const user of users) {
        try {
          // 1. Generate day 7 plans
          console.log(`👤 User ${user.userId}: Generating diet plan for ${day7Str}`);
          await dietPlanService.generateDietPlanForDate(user.userId, day7Str);

          console.log(
            `👤 User ${user.userId}: Generating exercise plan for ${day7Str}`
          );
          await exercisePlanService.generateExercisePlanForDate(
            user.userId,
            day7Str
          );

          // 2. Delete day -1 plans
          console.log(
            `👤 User ${user.userId}: Removing old plans for ${yesterdayStr}`
          );
          await dietPlanService.deleteDietPlanForDate(
            user.userId,
            yesterdayStr
          );
          await exercisePlanService.deleteExercisePlanForDate(
            user.userId,
            yesterdayStr
          );

          console.log(`✅ User ${user.userId}: Successfully processed plans`);
        } catch (userError) {
          console.error(
            `❌ Error processing plans for user ${user.userId}:`,
            userError
          );
        }
      }

      console.log("✅ Daily Sliding-Window Scheduler completed successfully");
    } catch (error) {
      console.error("❌ Error in Daily Sliding-Window Scheduler:", error);
    }
  });

  console.log("✅ Daily Sliding-Window Scheduler initialized");
};

/**
 * Startup Integrity Checker
 * Runs once when the server starts to ensure all users have 7 days of plans
 */
const runStartupIntegrityChecker = async () => {
  console.log("🔍 Running Startup Integrity Checker");

  try {
    // Get all users
    const users = await User.findAll({
      attributes: ["userId"],
    });

    console.log(`📊 Checking plan integrity for ${users.length} users`);

    // Calculate dates for the next 7 days
    const today = timezoneUtils.getCurrentIST();
    const nextSevenDays = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      nextSevenDays.push(date.toISOString().split("T")[0]);
    }

    console.log(`📅 Checking plans for dates: ${nextSevenDays.join(", ")}`);

    // Process each user
    for (const user of users) {
      try {
        // Check diet plans
        const missingDietDates = await dietPlanService.findMissingDates(
          user.userId,
          nextSevenDays
        );

        if (missingDietDates.length > 0) {
          console.log(
            `👤 User ${
              user.userId
            }: Missing diet plans for dates: ${missingDietDates.join(", ")}`
          );

          for (const date of missingDietDates) {
            console.log(
              `👤 User ${user.userId}: Generating missing diet plan for ${date}`
            );
            await dietPlanService.generateDietPlanForDate(user.userId, date);
          }
        }

        // Check exercise plans
        const missingExerciseDates = await exercisePlanService.findMissingDates(
          user.userId,
          nextSevenDays
        );

        if (missingExerciseDates.length > 0) {
          console.log(
            `👤 User ${
              user.userId
            }: Missing exercise plans for dates: ${missingExerciseDates.join(
              ", "
            )}`
          );

          for (const date of missingExerciseDates) {
            console.log(
              `👤 User ${user.userId}: Generating missing exercise plan for ${date}`
            );
            await exercisePlanService.generateExercisePlanForDate(
              user.userId,
              date
            );
          }
        }

      } catch (userError) {
        console.error(`❌ Error checking plans for user ${user.userId}:`, userError);
      }
    }

    console.log("✅ Startup Integrity Checker completed successfully");
  } catch (error) {
    console.error("❌ Error in Startup Integrity Checker:", error);
  }
};

module.exports = {
  initDailySlidingWindowScheduler,
  runStartupIntegrityChecker,
};
