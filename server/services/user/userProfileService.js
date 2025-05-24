const profileRepository = require("./repositories/userProfileRepository");
const userRepository = require("./repositories/userRepository");
const healthMetricRepository = require("./repositories/healthMetricRepository");
const monthlyHealthMetricRepository = require("./repositories/monthlyHealthMetricRepository");
const {info, warn, debug} = require("@dtwin/config")
const { healthScoreService } = require("../ml/index");
const { updateMealNotifications } = require('../notification/utils/notificationUpdateUtils');

const getProfile = async (userId) => {
  return await profileRepository.findById(userId);
};

const createProfile = async (userId, profileData) => {
  // Validate user exists
  const user = await userRepository.findById(userId);
  if (!user) throw new Error("User not found");

  // Check if profile already exists for this user
  const existingProfile = await profileRepository.findById(userId);
  if (existingProfile) throw new Error("Profile already exists for this user");

  // Create profile with userId
  return await profileRepository.createProfile({
    userId: userId,
    ...profileData,
  });
};

const updateProfile = async (profileId, updateData) => {
  // Get the existing profile to check for meal timing changes
  const existingProfile = await profileRepository.findById(profileId);
  if (!existingProfile) throw new Error("User profile not found");
  
  // Check if meal timings are being updated
  const hasMealTimingChanges = updateData.meal_timings && 
    JSON.stringify(existingProfile.meal_timings) !== JSON.stringify(updateData.meal_timings);
  
  // Update the profile in the database
  const profile = await profileRepository.updateProfile(profileId, updateData);
  if (!profile) throw new Error("User is already deleted");
  
  // If meal timings have changed, update the notifications
  if (hasMealTimingChanges) {
    try {
      // Get notification queues
      const notificationQueues = await getNotificationQueues();
      
      if (notificationQueues) {
        // Cancel existing and schedule new notifications with the updated timings
        await updateMealNotifications(
          notificationQueues, 
          profileId, 
          updateData.meal_timings
        );
        info(`Updated meal notifications for user ${profileId} with new timings`);
      }
    } catch (notifError) {
      warn(`Failed to update meal notifications: ${notifError.message}`);
      // Continue processing - notification update failure shouldn't fail the profile update
    }
  }
  
  return profile;
};

// Helper function to get notification queues
async function getNotificationQueues() {
  try {
    // Try to get global notification queues
    if (global.notificationQueues) {
      return global.notificationQueues;
    }
    
    // If not available globally, try to require and initialize
    const { initQueues } = require('../notification/queues');
    return await initQueues();
  } catch (error) {
    warn(`Failed to get notification queues: ${error.message}`);
    return null;
  }
}

const getHealthScore = async (userId) => {
  //generate score for user
  const healthScore = await healthScoreService.getHealthScore(userId);
  return healthScore;
};

const saveFitbitAuth = async (userId, authData) => {
  // Get existing profile
  const profile = await profileRepository.findById(userId);
  if (!profile) throw new Error("User profile not found");

  // Prepare the wearableIntegration data
  const wearableIntegration = profile.wearableIntegration || {};
  
  // Update with Fitbit auth data
  wearableIntegration.fitbit = {
    accessToken: authData.access_token,
    refreshToken: authData.refresh_token,
    expiresIn: authData.expires_in,
    userId: authData.user_id,
    lastSync: new Date()
  };

  // Update the profile
  return await profileRepository.updateProfile(userId, {
    wearableIntegration: wearableIntegration
  });
};

const getFitbitAuth = async (userId) => {
  const profile = await profileRepository.findById(userId);
  if (!profile || !profile.wearableIntegration || !profile.wearableIntegration.fitbit) {
    return null;
  }
  return profile.wearableIntegration.fitbit;
};

const updateFitbitLastSync = async (userId) => {
  const profile = await profileRepository.findById(userId);
  if (!profile || !profile.wearableIntegration || !profile.wearableIntegration.fitbit) {
    throw new Error("Fitbit integration not found for user");
  }

  const wearableIntegration = { ...profile.wearableIntegration };
  wearableIntegration.fitbit.lastSync = new Date();

  return await profileRepository.updateProfile(userId, {
    wearableIntegration: wearableIntegration
  });
};

// Calculate leaderboard score from health metrics
const calculateLeaderboardScore = (metrics) => {
  const weights = {
    health_score: 0.4,
    sleep_score: 0.2,
    activity_score: 0.2,
    food_score: 0.1,
    metabolic_score: 0.1
  };

  // Get scores
  const scores = {
    health_score: metrics.health_score || 0,
    sleep_score: metrics.sleep_score || 0,
    activity_score: metrics.activity_score || 0,
    food_score: metrics.food_score || 0,
    metabolic_score: metrics.metabolic_score || 0
  };

  // Check if we have enough data to calculate a leaderboard score
  const hasEnoughData = Object.values(scores).some(score => score > 0);
  
  if (!hasEnoughData) {
    return null;
  }

  // Calculate weighted score
  let leaderboardScore = 0;
  let totalWeight = 0;
  
  for (const [key, value] of Object.entries(scores)) {
    if (value > 0) {
      leaderboardScore += value * weights[key];
      totalWeight += weights[key];
    }
  }
  
  // Normalize by total weight used
  if (totalWeight > 0) {
    leaderboardScore = leaderboardScore / totalWeight;
  }
  
  return parseFloat(leaderboardScore.toFixed(2));
};

// Get daily leaderboard
const getDailyLeaderboard = async (userId, date) => {
  // Parse date
  const [year, month, day] = date.split("-").map(Number);
  
  if (!year || !month || !day) {
    throw new Error("Invalid date format. Please use 'YYYY-MM-DD'.");
  }
  
  // First check if user exists
  const userExists = await userRepository.findById(userId);
  if (!userExists) {
    throw new Error(`User with ID ${userId} does not exist`);
  }
  
  try {
    // Get user's health metric for the day
    const userMetric = await healthMetricRepository.getOrCreateHealthMetricFromDate(
      userId,
      year,
      month,
      day
    );
    
    // If leaderboard_score is null, calculate it
    if (userMetric.leaderboard_score === null) {
      const calculatedScore = calculateLeaderboardScore(userMetric);
      
      // If we can't calculate a score, return no rank found
      if (calculatedScore === null) {
        return "NO_RANK";
      }
      
      // Update the user's leaderboard score
      await healthMetricRepository.updateHealthMetricByDate(
        year,
        month,
        day,
        userId,
        { leaderboard_score: calculatedScore }
      );
      
      userMetric.leaderboard_score = calculatedScore;
    }
    
    // Get all users' leaderboard scores for the day
    const allScores = await healthMetricRepository.getDailyLeaderboardScores(year, month, day);
    
    // If we have no scores, return no rank found
    if (allScores.length === 0) {
      return "NO_RANK";
    }
    
    // Sort scores in descending order
    allScores.sort((a, b) => b.leaderboard_score - a.leaderboard_score);
    
    // Find user's rank
    const userRank = allScores.findIndex(entry => entry.userId === userId) + 1;
    
    // If user not found in rankings, return no rank found
    if (userRank === 0) {
      return "NO_RANK";
    }
    
    // Calculate range of ranks to return (5 above, 5 below)
    const startRank = Math.max(1, userRank - 5);
    const endRank = Math.min(allScores.length, userRank + 5);
    
    // Extract leaderboard data
    const leaderboardEntries = allScores.slice(startRank - 1, endRank).map((entry, index) => {
      const rank = startRank + index;
      const isCurrentUser = entry.userId === userId;
      
      return {
        rank,
        userId: entry.userId,
        username: entry.username || `User ${entry.userId.substr(0, 8)}`,
        score: entry.leaderboard_score,
        isCurrentUser
      };
    });
    
    return {
      userRank,
      totalUsers: allScores.length,
      leaderboard: leaderboardEntries
    };
  } catch (error) {
    if (error.message && error.message.includes('does not exist')) {
      // Handle non-existent user error specifically
      throw error;
    } else {
      // For other errors, return NO_RANK
      return "NO_RANK";
    }
  }
};

// Get monthly leaderboard
const getMonthlyLeaderboard = async (userId, year, month) => {
  // First check if user exists
  const userExists = await userRepository.findById(userId);
  if (!userExists) {
    throw new Error(`User with ID ${userId} does not exist`);
  }
  
  try {
    // Get user's monthly health metric
    const userMetric = await monthlyHealthMetricRepository.getOrCreateMonthlyMetric(userId, year, month);
    
    // If monthly_leaderboard_score is null, calculate it
    if (userMetric.monthly_leaderboard_score === null) {
      // Get monthly metrics for calculation
      const monthlyMetric = await monthlyHealthMetricRepository.getMonthlyMetric(userId, year, month, true);
      
      const metricsForScore = {
        health_score: monthlyMetric?.monthly_health_score || null,
        sleep_score: monthlyMetric?.monthly_sleep_score || null,
        activity_score: monthlyMetric?.monthly_activity_score || null,
        food_score: monthlyMetric?.monthly_food_score || null,
        metabolic_score: null // Assuming this might not exist at monthly level
      };
      
      const calculatedScore = calculateLeaderboardScore(metricsForScore);
      
      // If we can't calculate a score, return no rank found
      if (calculatedScore === null) {
        return "NO_RANK";
      }
      
      // Update the user's monthly leaderboard score
      await monthlyHealthMetricRepository.updateMonthlyMetric(
        userId,
        year,
        month,
        { monthly_leaderboard_score: calculatedScore }
      );
      
      userMetric.monthly_leaderboard_score = calculatedScore;
    }
    
    // Get all users' monthly leaderboard scores
    const allScores = await monthlyHealthMetricRepository.getMonthlyLeaderboardScores(year, month);
    
    // If we have no scores, return no rank found
    if (allScores.length === 0) {
      return "NO_RANK";
    }
    
    // Sort scores in descending order
    allScores.sort((a, b) => b.monthly_leaderboard_score - a.monthly_leaderboard_score);
    
    // Find user's rank
    const userRank = allScores.findIndex(entry => entry.userId === userId) + 1;
    
    // If user not found in rankings, return no rank found
    if (userRank === 0) {
      return "NO_RANK";
    }
    
    // Calculate range of ranks to return (5 above, 5 below)
    const startRank = Math.max(1, userRank - 5);
    const endRank = Math.min(allScores.length, userRank + 5);
    
    // Extract leaderboard data
    const leaderboardEntries = allScores.slice(startRank - 1, endRank).map((entry, index) => {
      const rank = startRank + index;
      const isCurrentUser = entry.userId === userId;
      
      return {
        rank,
        userId: entry.userId,
        username: entry.username || `User ${entry.userId.substr(0, 8)}`,
        score: entry.monthly_leaderboard_score,
        isCurrentUser
      };
    });
    
    return {
      userRank,
      totalUsers: allScores.length,
      leaderboard: leaderboardEntries
    };
  } catch (error) {
    if (error.message && error.message.includes('does not exist')) {
      // Handle non-existent user error specifically
      throw error;
    } else {
      // For other errors, return NO_RANK
      return "NO_RANK";
    }
  }
};

module.exports = {
  getProfile,
  createProfile,
  updateProfile,
  getHealthScore,
  saveFitbitAuth,
  getFitbitAuth,
  updateFitbitLastSync,
  getDailyLeaderboard,
  getMonthlyLeaderboard
};