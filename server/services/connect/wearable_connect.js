const axios = require("axios");
const userProfileService = require("../../services/user/userProfileService");
const { info, errorLog, warn, debug } = require("@dtwin/config");
const { estimateCaloriesBurned } = require("@dtwin/ml-score-function");
const timezoneUtils = require("../../common/utils/timezone");
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:4000/api";

const createErrorResponse = (code, message, error, details = {}) => {
  errorLog(`Wearable Connect Error [${code}]: ${message}`, error);
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

// Helper function to get Fitbit auth data
async function getFitbitAuthData(userId, accessToken, fitbitUserId = null) {
  if (!accessToken && !fitbitUserId) {
    return {
      error: true,
      message: "Access token or Fitbit user ID is required.",
    };
  }

  const auth = { accessToken, fitbitUserId };

  if (!fitbitUserId) {
    try {
      const response = await axios.get(
        "https://api.fitbit.com/1/user/-/profile.json",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data && response.data.user) {
        auth.fitbitUserId = response.data.user.encodedId;
      } else {
        errorLog("Could not retrieve Fitbit user ID from profile.");
        return { error: true, message: "Could not retrieve Fitbit user ID." };
      }
    } catch (error) {
      errorLog("Error fetching Fitbit profile:", error.message);
      return { error: true, message: "Error fetching Fitbit profile." };
    }
  }

  return auth;
}

async function validateAndTransformActivityData(activityData, userId) {
  try {
    if (!activityData) {
      throw new Error("Activity data is missing or invalid");
    }

    const transform = (activity) => {
      // Combine startDate and startTime to get a full ISO string
      let startTime;
      if (activity.startDate && activity.startTime) {
        // e.g., startDate: '2025-04-25', startTime: '12:10'
        startTime = new Date(`${activity.startDate}T${activity.startTime}:00Z`);
      } else if (activity.startTime) {
        // Fallback: try to parse as time today (not recommended, but fallback)
        const today = new Date().toISOString().split("T")[0];
        startTime = new Date(`${today}T${activity.startTime}:00Z`);
      } else {
        throw new Error(`Missing startDate or startTime in activity`);
      }

      if (isNaN(startTime.getTime())) {
        throw new Error(
          `Invalid start time: ${activity.startDate} ${activity.startTime}`
        );
      }

      const endTime = activity.duration
        ? new Date(startTime.getTime() + activity.duration)
        : null;
      return {
        activity_type: activity.name?.toLowerCase() || "unknown",
        start_time: startTime,
        end_time: endTime,
        source_device: activity.source?.name || "Fitbit",
        duration_seconds: activity.duration
          ? Math.floor(activity.duration / 1000)
          : null,
        calories_burned: activity.calories || null,
        distance_meters: activity.distance ? activity.distance * 1000 : null,
        steps_count: activity.steps || null,
        heart_rate_avg: activity.averageHeartRate || null,
        heart_rate_max:
          activity.heartRateZones?.reduce(
            (max, zone) => Math.max(max, zone.max),
            0
          ) || null,
        heart_rate_zones: activity.heartRateZones || null,
        intensity_level: activity.intensity || null,
      };
    };

    if (Array.isArray(activityData)) {
      return activityData.map(transform);
    }

    if (activityData.activities && Array.isArray(activityData.activities)) {
      return activityData.activities.map(transform);
    }

    // Single object
    return transform(activityData);
  } catch (error) {
    errorLog(`Error validating activity data: ${error}`);
    throw error;
  }
}

async function validateAndTransformSleepData(sleepData, userId) {
  try {
    // Handle both array and single object inputs
    const sleepRecords = Array.isArray(sleepData) ? sleepData : [sleepData];

    const transformedRecords = [];

    for (const record of sleepRecords) {
      const sleepDate =
        record.dateOfSleep || new Date().toISOString().split("T")[0];
      const durationSeconds = Math.floor((record.duration || 0) / 1000);

      // Process sleep stages
      const sleepStages = [];

      if (record.levels && record.levels.data) {
        // Process detailed sleep stages
        for (const dataPoint of record.levels.data) {
          const stageType = mapSleepStageType(dataPoint.level);
          sleepStages.push({
            stageType: stageType,
            startTime: new Date(dataPoint.dateTime),
            endTime: new Date(
              new Date(dataPoint.dateTime).getTime() + dataPoint.seconds * 1000
            ),
            durationSeconds: dataPoint.seconds || 0,
          });
        }
      } else if (record.levels && record.levels.summary) {
        // Process summary data if detailed data isn't available
        const summary = record.levels.summary;
        let currentTime = new Date(record.startTime);

        // Process each stage type
        for (const [stageType, minutes] of Object.entries(summary)) {
          if (minutes > 0) {
            const durationMs = minutes * 60 * 1000;
            sleepStages.push({
              stageType: mapSleepStageType(stageType),
              startTime: new Date(currentTime),
              endTime: new Date(currentTime.getTime() + durationMs),
              durationSeconds: Math.floor(durationMs / 1000),
            });
            currentTime = new Date(currentTime.getTime() + durationMs);
          }
        }
      }

      transformedRecords.push({
        date: sleepDate,
        startTime: new Date(record.startTime),
        endTime: new Date(record.endTime),
        sourceDevice: record.sourceDevice || "Fitbit",
        durationSeconds: durationSeconds,
        efficiencyScore: record.efficiency || null,
        sleepStages: sleepStages,
      });
    }

    return transformedRecords.length === 1
      ? transformedRecords[0]
      : transformedRecords;
  } catch (error) {
    errorLog("Error validating sleep data:", error);
    throw error;
  }
}

function mapSleepStageType(fitbitStageType) {
  const stageMap = {
    wake: "AWAKE",
    light: "LIGHT",
    deep: "DEEP",
    rem: "REM",
    asleep: "LIGHT",
    restless: "REM",
    awake: "AWAKE",
  };

  return stageMap[fitbitStageType] || "LIGHT";
}

async function fetchSleepData(
  accessToken,
  date,
  userId,
  fitbitUserId = null,
  userAuthToken
) {
  try {
    const auth = await getFitbitAuthData(userId, accessToken, fitbitUserId);

    if (auth.error) {
      return auth;
    }

    const response = await axios.get(
      `https://api.fitbit.com/1.2/user/${auth.fitbitUserId}/sleep/date/${date}.json`,
      {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
        },
      }
    );

    if (
      response.data &&
      response.data.sleep &&
      response.data.sleep.length > 0
    ) {
      await storeSleepData(
        response.data.sleep,
        userId,
        auth.accessToken,
        date,
        userAuthToken
      );
    }

    return response.data;
  } catch (error) {
    errorLog("Error fetching sleep data:", error.message);
    throw error;
  }
}

async function fetchSleepDataRange(
  accessToken,
  startDate,
  endDate,
  userId,
  fitbitUserId = null,
  userAuthToken
) {
  try {
    const auth = await getFitbitAuthData(userId, accessToken, fitbitUserId);

    if (auth.error) {
      return auth;
    }

    const response = await axios.get(
      `https://api.fitbit.com/1.2/user/${auth.fitbitUserId}/sleep/date/${startDate}/${endDate}.json`,
      {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
        },
      }
    );

    if (
      response.data &&
      response.data.sleep &&
      response.data.sleep.length > 0
    ) {
      await storeSleepData(
        response.data.sleep,
        userId,
        auth.accessToken,
        startDate,
        userAuthToken
      );
    }

    return response.data;
  } catch (error) {
    errorLog("Error fetching sleep data range:", error.message);
    throw error;
  }
}

async function fetchActivities(
  accessToken,
  date,
  userId,
  fitbitUserId = null,
  userAuthToken
) {
  try {
    const auth = await getFitbitAuthData(userId, accessToken, fitbitUserId);

    if (auth.error) {
      return auth;
    }

    const response = await axios.get(
      `https://api.fitbit.com/1/user/${auth.fitbitUserId}/activities/date/${date}.json`,
      {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
        },
      }
    );

    if (
      response.data &&
      response.data.activities &&
      response.data.activities.length > 0
    ) {
      await storeActivitiesData(
        response.data.activities,
        userId,
        auth.accessToken,
        date,
        userAuthToken
      );
    }

    return response.data;
  } catch (error) {
    errorLog("Error fetching activities:", error.message);
    throw error;
  }
}

async function fetchDailyData(
  accessToken,
  date,
  userId,
  fitbitUserId = null,
  userAuthToken
) {
  try {
    const auth = await getFitbitAuthData(userId, accessToken, fitbitUserId);

    if (auth.error) {
      return auth;
    }

    const response = await axios.get(
      `https://api.fitbit.com/1/user/${auth.fitbitUserId}/activities/date/${date}.json`,
      {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    errorLog("Error fetching daily data:", error.message);
    throw error;
  }
}

async function storeSleepData(
  sleepData,
  userId,
  accessToken,
  date,
  userAuthToken
) {
  try {
    // Transform the sleep data to match the database schema
    const transformedData = await validateAndTransformSleepData(
      sleepData,
      userId
    );

    // Support both single and multiple sleep sessions
    const sleepSessions = Array.isArray(transformedData)
      ? transformedData
      : [transformedData];

    // Prepare payload for API
    const payload = sleepSessions.map((session) => {
      // Ensure sleepStages is always an array
      const sleepStages = Array.isArray(session.sleepStages)
        ? session.sleepStages
        : Object.values(session.sleepStages || {});

      return {
        date: session.date,
        startTime: session.startTime,
        endTime: session.endTime,
        sourceDevice: session.sourceDevice,
        durationSeconds: session.durationSeconds,
        efficiencyScore: session.efficiencyScore,
        sleepStages: sleepStages.map((stage) => ({
          stageType: stage.stageType,
          startTime: stage.startTime,
          endTime: stage.endTime,
          durationSeconds: stage.durationSeconds,
        })),
      };
    });

    // Call the API endpoint with properly formatted data
    const response = await axios.post(
      `${API_BASE_URL}/sleep`,
      payload, // Send array of sleep sessions
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userAuthToken}`,
        },
      }
    );

    info("Sleep data stored successfully");
    return response.data;
  } catch (error) {
    errorLog(
      "Error storing sleep data:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function storeActivitiesData(
  activitiesData,
  userId,
  accessToken,
  date,
  userAuthToken
) {
  try {
    // Transform the activity data to match the database schema
    const transformedData = await validateAndTransformActivityData(
      activitiesData,
      userId
    );

    // Prepare the payload for the API
    const payload = Array.isArray(transformedData)
      ? transformedData
      : [transformedData];
    console.log("Transformed activities data:", payload);

    // Call the API endpoint with properly formatted data
    const response = await axios.post(`${API_BASE_URL}/activity`, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userAuthToken}`,
      },
    });

    info("Activities data stored successfully");
    return response.data;
  } catch (error) {
    errorLog(
      `Error storing activities data: ${error.response?.data || error.message}`
    );
    throw error;
  }
}

async function storeStepsData(
  summaryData,
  userId,
  accessToken,
  date,
  userAuthToken
) {
  try {
    const steps = summaryData.steps || 0;
    const response = await axios.patch(
      `${API_BASE_URL}/health-metrics?date=${date}`,
      {
        total_steps: steps,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userAuthToken}`,
        },
      }
    );

    info(`Steps data patched successfully for date: ${date}`);
    return response.data;
  } catch (error) {
    errorLog("Error storing steps data:", error.message);
    throw error;
  }
}

async function storeDistanceData(
  summaryData,
  userId,
  accessToken,
  date,
  userAuthToken
) {
  try {
    const distanceObj = summaryData.distances.find(
      (d) => d.activity === "total"
    );
    const distance = distanceObj ? distanceObj.distance : 0;

    const response = await axios.patch(
      `${API_BASE_URL}/health-metrics?date=${date}`,
      {
        distance_covered: distance,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userAuthToken}`,
        },
      }
    );

    info(`Distance data patched successfully for date: ${date}`);
    return response.data;
  } catch (error) {
    errorLog("Error storing distance data:", error.message);
    throw error;
  }
}

async function storeSpO2Data(
  spo2Data,
  userId,
  accessToken,
  date,
  userAuthToken
) {
  try {
    // Assuming you want to store the average SpO2 value
    const avgSpO2 =
      spo2Data.reduce((sum, entry) => sum + entry.avg, 0) / spo2Data.length;

    const maxSpO2 = Math.max(...spo2Data.map((entry) => entry.avg));
    const minSpO2 = Math.min(...spo2Data.map((entry) => entry.avg));
    const response = await axios.patch(
      `${API_BASE_URL}/health-metrics?date=${date}`,
      {
        spo2_avg: avgSpO2,
        spo2_min: minSpO2,
        spo2_max: maxSpO2,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userAuthToken}`,
        },
      }
    );

    info(`SpO2 data patched successfully for date: ${date}`);
    return response.data;
  } catch (error) {
    console.log("Error storing SpO2 data:", error.message);
    throw error;
  }
}

async function storeHeartRateData(
  heartRateData,
  userId,
  accessToken,
  date,
  userAuthToken
) {
  try {
    // Extract and transform the heart rate data
    const restingHeartRate = heartRateData[0]?.value?.restingHeartRate || null;

    // Extract heart rate zones if available
    const heartRateZones =
      heartRateData[0]?.value?.heartRateZones?.map((zone) => ({
        name: zone.name,
        min: zone.min,
        max: zone.max,
        minutes: zone.minutes,
        calories: zone.caloriesOut,
      })) || null;

    // Extract intraday data if available (for detailed heart rate tracking)
    const intradayData =
      heartRateData[0]?.value?.heartRateIntraday?.dataset?.map((point) => ({
        time: point.time,
        value: point.value,
      })) || null;

    // Prepare the payload according to the heartData schema
    const payload = {
      resting_heart_rate: restingHeartRate,
      heart_rate_zones: heartRateZones,
      heart_rate_data: intradayData,
    };

    const response = await axios.patch(
      `${API_BASE_URL}/health-metrics/heart?date=${date}`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userAuthToken}`,
        },
      }
    );

    info("Heart rate data patched successfully");
    return response.data;
  } catch (error) {
    errorLog(
      "Error storing heart rate data:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function storeActivitySummary(
  summaryData,
  userId,
  accessToken,
  date,
  userAuthToken
) {
  try {
    const activityMinutes = {
      sedentaryMinutes: summaryData.sedentaryMinutes || 0,
      lightlyActiveMinutes: summaryData.lightlyActiveMinutes || 0,
      fairlyActiveMinutes: summaryData.fairlyActiveMinutes || 0,
      veryActiveMinutes: summaryData.veryActiveMinutes || 0,
    };

    const response = await axios.patch(
      `${API_BASE_URL}/health-metrics?date=${date}`,
      {
        activity_minutes: activityMinutes,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userAuthToken}`,
        },
      }
    );

    info("Activity summary data patched successfully");
    return response.data;
  } catch (error) {
    errorLog(
      "Error storing activity summary:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function storeSkinTemperature(
  tempData,
  userId,
  accessToken,
  date,
  userAuthToken
) {
  try {
    const skinTemp = tempData.value?.nightlyRelative || null;

    const response = await axios.patch(
      `${API_BASE_URL}/health-metrics?date=${date}`,
      {
        skin_temp: skinTemp,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userAuthToken}`,
        },
      }
    );

    info("Skin temperature data patched successfully");
    return response.data;
  } catch (error) {
    errorLog(
      "Error storing skin temperature:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function storeBreathingRate(
  brData,
  userId,
  accessToken,
  date,
  userAuthToken
) {
  try {
    const breathingRate = brData.value?.breathingRate || null;

    const response = await axios.patch(
      `${API_BASE_URL}/health-metrics?date=${date}`,
      {
        breathing_rate: breathingRate,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userAuthToken}`,
        },
      }
    );

    info("Breathing rate data patched successfully");
    return response.data;
  } catch (error) {
    errorLog(
      "Error storing breathing rate:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function storeHrvData(hrvDataArray, userId, accessToken, userAuthToken) {
  try {
    for (const dayData of hrvDataArray) {
      if (dayData.minutes && dayData.minutes.length > 0) {
        // Transform the data to store only time (not full datetime)
        const hrvMinutes = dayData.minutes.map((minute) => {
          const dateTime = new Date(minute.minute);
          const timeOnly = dateTime.toTimeString().split(" ")[0]; // Gets HH:MM:SS

          return {
            time: timeOnly,
            value: {
              rmssd: minute.value.rmssd || null,
              coverage: minute.value.coverage || null,
              hf: minute.value.hf || null,
              lf: minute.value.lf || null,
            },
          };
        });

        // Extract date from the first minute entry
        const firstMinute = new Date(dayData.minutes[0].minute);
        const date = firstMinute.toISOString().split("T")[0];

        const response = await axios.post(
          `${API_BASE_URL}/hrv-data`,
          {
            date: date,
            hrv_minutes: hrvMinutes,
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${userAuthToken}`,
            },
          }
        );

        info(`HRV data stored successfully for date: ${date}`);
      }
    }
  } catch (error) {
    errorLog("Error storing HRV data:", error.response?.data || error.message);
    throw error;
  }
}

async function storeCardioScore(
  cardioData,
  userId,
  accessToken,
  date,
  userAuthToken
) {
  try {
    const vo2Max = Number.parseFloat(cardioData.value?.vo2Max) || null;

    const response = await axios.patch(
      `${API_BASE_URL}/health-metrics?date=${date}`,
      {
        vo2Max: vo2Max,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userAuthToken}`,
        },
      }
    );

    info("Cardio score (VO2 Max) data patched successfully");
    return response.data;
  } catch (error) {
    errorLog(
      "Error storing cardio score:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function fetchStepsData(
  accessToken,
  date,
  userId,
  fitbitUserId = null,
  userAuthToken
) {
  try {
    const auth = await getFitbitAuthData(userId, accessToken, fitbitUserId);

    if (auth.error) {
      return auth;
    }

    const response = await axios.get(
      `https://api.fitbit.com/1/user/${auth.fitbitUserId}/activities/date/${date}.json`,
      {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
        },
      }
    );

    if (response.data && response.data.summary) {
      await storeStepsData(
        response.data.summary,
        userId,
        auth.accessToken,
        date,
        userAuthToken
      );
    }

    return response.data;
  } catch (error) {
    console.log(error);
    errorLog(`Error fetching steps data: ${error}`);
    throw error;
  }
}

async function fetchDistanceData(
  accessToken,
  date,
  userId,
  fitbitUserId = null,
  userAuthToken
) {
  try {
    const auth = await getFitbitAuthData(userId, accessToken, fitbitUserId);

    if (auth.error) {
      return auth;
    }

    const response = await axios.get(
      `https://api.fitbit.com/1/user/${auth.fitbitUserId}/activities/date/${date}.json`,
      {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
        },
      }
    );

    if (response.data && response.data.summary) {
      await storeDistanceData(
        response.data.summary,
        userId,
        auth.accessToken,
        date,
        userAuthToken
      );
    }

    return response.data;
  } catch (error) {
    errorLog("Error fetching distance data:", error.message);
    throw error;
  }
}

async function fetchSpO2Data(
  accessToken,
  date,
  userId,
  fitbitUserId = null,
  userAuthToken
) {
  try {
    const auth = await getFitbitAuthData(userId, accessToken, fitbitUserId);

    if (auth.error) {
      return auth;
    }
    const response = await axios.get(
      `https://api.fitbit.com/1/user/${auth.fitbitUserId}/spo2/date/${date}.json`,
      {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
        },
      }
    );

    if (response.data && response.data["spo2"]) {
      await storeSpO2Data(
        response.data["spo2"],
        userId,
        auth.accessToken,
        date,
        userAuthToken
      );
    }

    return response.data;
  } catch (error) {
    errorLog("Error fetching SpO2 data:", error.message);
    throw error;
  }
}

async function fetchHeartRateData(
  accessToken,
  date,
  userId,
  fitbitUserId = null,
  userAuthToken
) {
  try {
    const auth = await getFitbitAuthData(userId, accessToken, fitbitUserId);

    if (auth.error) {
      return auth;
    }

    const response = await axios.get(
      `https://api.fitbit.com/1/user/${auth.fitbitUserId}/activities/heart/date/${date}/1d.json`,
      {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
        },
      }
    );

    if (response.data && response.data["activities-heart"]) {
      await storeHeartRateData(
        response.data["activities-heart"],
        userId,
        auth.accessToken,
        date,
        userAuthToken
      );
    }

    return response.data;
  } catch (error) {
    errorLog("Error fetching heart rate data:", error.message);
    throw error;
  }
}

async function validateAndTransformHealthConnectData(healthData, userId) {
  try {
    // Initialize activity data with source device and timestamp info

    const activityData = {
      activity_type: healthData.activity_type || "General",
      source_device: "health_connect",
      start_time: healthData.start_time
        ? new Date(healthData.start_time).toISOString()
        : new Date().toISOString(),
      end_time: healthData.end_time
        ? new Date(healthData.end_time).toISOString()
        : null,
      duration_seconds: healthData.duration_seconds || null,
      calories_burned: healthData.calories_burned
        ? parseInt(healthData.calories_burned)
        : null,
      distance_meters: healthData.distance_km
        ? parseFloat(healthData.distance_km) * 1000
        : null,
      steps_count: healthData.steps_count
        ? parseInt(healthData.steps_count)
        : null,
      heart_rate_avg: healthData.heart_rate_avg
        ? parseInt(healthData.heart_rate_avg)
        : null,
      heart_rate_max: healthData.heart_rate_max
        ? parseInt(healthData.heart_rate_max)
        : null,
    };

    return [activityData];
  } catch (error) {
    errorLog("Error validating Health Connect data:", error);
    throw error;
  }
}

async function validateAndTransformHealthConnectSleepData(healthData, userId) {
  try {
    // Extract date from input or use current date
    const date = healthData.date || new Date().toISOString().split("T")[0];

    // Transform sleep stages if provided
    const sleepStages = [];
    if (healthData.sleepStages && Array.isArray(healthData.sleepStages)) {
      // Use provided sleep stages
      sleepStages.push(...healthData.sleepStages);
    } else if (healthData.stageData) {
      // Process stage data if available in alternative format
      for (const stage of healthData.stageData) {
        sleepStages.push({
          stageType: stage.type || "UNKNOWN",
          startTime: stage.startTime || null,
          endTime: stage.endTime || null,
          durationSeconds: stage.durationSeconds || 0,
        });
      }
    }

    // Create the sleep data object with null/default values for missing fields
    return {
      date: date,
      startTime: healthData.startTime || null,
      endTime: healthData.endTime || null,
      sourceDevice: "health_connect",
      durationSeconds: healthData.durationSeconds || null,
      efficiencyScore: healthData.efficiencyScore || null,
      minutesAsleep: healthData.minutesAsleep || null,
      minutesAwake: healthData.minutesAwake || null,
      minutesToFallAsleep: healthData.minutesToFallAsleep || null,
      isMainSleep: healthData.isMainSleep || true,
      timeInBed: healthData.timeInBed || null,
      logId: `health_connect_${Date.now()}`,
      sleepStages: sleepStages,
      raw_data: JSON.stringify(healthData),
    };
  } catch (error) {
    errorLog("Error validating Health Connect sleep data:", error);
    throw error;
  }
}

async function processHealthConnectActivityData(
  activityData,
  userId,
  accessToken
) {
  try {
    // Use the activity-related data from the request
    const transformedData = await validateAndTransformHealthConnectData(
      activityData,
      userId
    );
    // Only proceed if we have valid activity data
    if (transformedData) {
      const response = await axios.post(
        `${API_BASE_URL}/activity`,
        transformedData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      info("Health Connect activity data posted successfully");
      return response.data.data.results;
    }

    return null;
  } catch (error) {
    errorLog("Error processing Health Connect activity data:", error);
    info("error", error);
    throw error;
  }
}

async function processHealthConnectSleepData(sleepData, userId, accessToken) {
  try {
    // Transform the sleep data
    const transformedData = await validateAndTransformHealthConnectSleepData(
      sleepData,
      userId
    );

    // Only proceed if we have valid sleep data
    if (transformedData) {
      const response = await axios.post(
        `${API_BASE_URL}/sleep`,
        [transformedData], // Wrap in array as the endpoint expects an array
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      info("Health Connect sleep data posted successfully");
      return response.data.data;
    }

    return null;
  } catch (error) {
    errorLog("Error processing Health Connect sleep data:", error);
    throw error;
  }
}

// Keep the original function for backward compatibility, but use the new specialized functions
async function processHealthConnectData(healthData, userId, accessToken) {
  try {
    if (!healthData) {
      return createErrorResponse(
        "MISSING_HEALTH_DATA",
        "Health Connect data is missing",
        "No health data provided",
        { userId }
      );
    }

    if (!userId) {
      return createErrorResponse(
        "MISSING_USER_ID",
        "User ID is required",
        "Missing userId parameter"
      );
    }

    // Process sleep data
    let sleepResult = { success: true, processed: 0 };
    if (
      healthData.sleep &&
      Array.isArray(healthData.sleep) &&
      healthData.sleep.length > 0
    ) {
      sleepResult = await processHealthConnectSleepData(
        healthData.sleep,
        userId,
        accessToken
      );
    }

    // Process activity data
    let activityResult = { success: true, processed: 0 };
    if (
      healthData.activities &&
      Array.isArray(healthData.activities) &&
      healthData.activities.length > 0
    ) {
      activityResult = await processHealthConnectActivityData(
        healthData.activities,
        userId,
        accessToken
      );
    }

    // TODO: Process other health data types (steps, heart rate, etc.)

    return {
      success: sleepResult.success && activityResult.success,
      message: "Processed Health Connect data",
      results: {
        sleep: sleepResult,
        activities: activityResult,
      },
    };
  } catch (error) {
    return createErrorResponse(
      "HEALTH_CONNECT_PROCESSING_ERROR",
      "Failed to process Health Connect data",
      error,
      { userId }
    );
  }
}

async function validateAndTransformManualActivityData(activityData, userId) {
  try {
    //get weight from user profile
    const { weight_kg } = await userProfileService.getProfile(userId);

    const calories_burned = estimateCaloriesBurned(
      activityData.activity_type,
      activityData.duration_seconds / 60,
      weight_kg
    );
    console.log("calories_burned", calories_burned);
    // Create activity data object with appropriate field names
    const transformedActivity = {
      activity_type:
        activityData.activity_name || activityData.activity_type || "General",
      start_time: activityData.start_time
        ? new Date(activityData.start_time).toISOString()
        : new Date().toISOString(),
      end_time: activityData.end_time
        ? new Date(activityData.end_time).toISOString()
        : null,
      source_device: "manual_entry",
      duration_seconds:
        activityData.duration_seconds || activityData.duration || null,
      calories_burned: activityData.calories_burned || null,
      distance_meters: activityData.distance_meters || null,
      steps_count: activityData.steps_count || null,
      heart_rate_avg: activityData.heart_rate_avg || null,
      heart_rate_max: activityData.heart_rate_max || null,
    };
    // Return as array to match health connect format
    return [transformedActivity];
  } catch (error) {
    errorLog("Error validating manual activity data:", error);
    throw error;
  }
}

async function validateAndTransformManualSleepData(sleepData, userId) {
  try {
    // Only use provided data, no calculations
    return {
      date: sleepData.date || timezoneUtils.getCurrentISTDate(),
      startTime: sleepData.startTime ? new Date(sleepData.startTime) : null,
      endTime: sleepData.endTime ? new Date(sleepData.endTime) : null,
      sourceDevice: "manual_entry",
      durationSeconds: sleepData.durationSeconds || null,
      efficiencyScore: sleepData.efficiencyScore || null,
      minutesAsleep: sleepData.minutesAsleep || null,
      minutesAwake: sleepData.minutesAwake || null,
      minutesToFallAsleep: sleepData.minutesToFallAsleep || null,
      isMainSleep: sleepData.isMainSleep || false,
      timeInBed: sleepData.timeInBed || null,
      logId: `manual_entry_${Date.now()}`,
      sleepStages: sleepData.sleepStages || [],
      raw_data: JSON.stringify({
        ...sleepData,
        source: "manual_entry",
      }),
    };
  } catch (error) {
    errorLog("Error validating manual sleep data:", error);
    throw error;
  }
}

async function processManualActivityData(activityData, userId, accessToken) {
  try {
    // Transform the activity data
    const transformedData = await validateAndTransformManualActivityData(
      activityData,
      userId
    );

    // Only proceed if we have valid activity data
    if (transformedData) {
      const response = await axios.post(
        `${API_BASE_URL}/activity`,
        transformedData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      info("Manual activity data posted successfully");
      return response.data.data.results;
    }

    return null;
  } catch (error) {
    errorLog("Error processing manual activity data:", error);
    throw error;
  }
}

async function processManualSleepData(sleepData, userId, accessToken) {
  try {
    // Transform the sleep data
    const transformedData = await validateAndTransformManualSleepData(
      sleepData,
      userId
    );

    info("Manual sleep data transformed");

    // Only proceed if we have valid sleep data
    if (transformedData) {
      const response = await axios.post(
        `${API_BASE_URL}/sleep`,
        [transformedData], // Wrap in array as the endpoint expects an array
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      info("Manual sleep data posted successfully");
      return response.data.data;
    }

    return null;
  } catch (error) {
    errorLog("Error processing manual sleep data:", error);
    throw error;
  }
}

// Keep the original function for backward compatibility, but use the new specialized functions
async function processManualEntryData(entryData, userId, accessToken) {
  try {
    let activityResponse = null;
    let sleepResponse = null;

    // Process activity data if available
    if (entryData.activity) {
      activityResponse = await processManualActivityData(
        entryData.activity,
        userId,
        accessToken
      );
    }

    // Process sleep data if available
    if (entryData.sleep) {
      sleepResponse = await processManualSleepData(
        entryData.sleep,
        userId,
        accessToken
      );
    }

    return {
      activity: activityResponse,
      sleep: sleepResponse,
    };
  } catch (error) {
    errorLog("Error processing manual entry data:", error);
    throw error;
  }
}

async function fetchActivitySummary(
  accessToken,
  date,
  userId,
  fitbitUserId = null,
  userAuthToken
) {
  try {
    const auth = await getFitbitAuthData(userId, accessToken, fitbitUserId);

    if (auth.error) {
      return auth;
    }

    const response = await axios.get(
      `https://api.fitbit.com/1/user/${auth.fitbitUserId}/activities/date/${date}.json`,
      {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
        },
      }
    );

    if (response.data && response.data.summary) {
      await storeActivitySummary(
        response.data.summary,
        userId,
        auth.accessToken,
        date,
        userAuthToken
      );
    }

    return response.data;
  } catch (error) {
    errorLog("Error fetching activity summary:", error.message);
    throw error;
  }
}

async function fetchSkinTemperature(
  accessToken,
  date,
  userId,
  fitbitUserId = null,
  userAuthToken
) {
  try {
    const auth = await getFitbitAuthData(userId, accessToken, fitbitUserId);

    if (auth.error) {
      return auth;
    }

    const response = await axios.get(
      `https://api.fitbit.com/1/user/${auth.fitbitUserId}/temp/skin/date/${date}.json`,
      {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
        },
      }
    );

    if (
      response.data &&
      response.data.tempSkin &&
      response.data.tempSkin.length > 0
    ) {
      await storeSkinTemperature(
        response.data.tempSkin[0],
        userId,
        auth.accessToken,
        date,
        userAuthToken
      );
    }

    return response.data;
  } catch (error) {
    errorLog("Error fetching skin temperature:", error.message);
    throw error;
  }
}

async function fetchBreathingRate(
  accessToken,
  date,
  userId,
  fitbitUserId = null,
  userAuthToken
) {
  try {
    const auth = await getFitbitAuthData(userId, accessToken, fitbitUserId);

    if (auth.error) {
      return auth;
    }

    const response = await axios.get(
      `https://api.fitbit.com/1/user/${auth.fitbitUserId}/br/date/${date}.json`,
      {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
        },
      }
    );

    if (response.data && response.data.br && response.data.br.length > 0) {
      await storeBreathingRate(
        response.data.br[0],
        userId,
        auth.accessToken,
        date,
        userAuthToken
      );
    }

    return response.data;
  } catch (error) {
    errorLog("Error fetching breathing rate:", error.message);
    throw error;
  }
}

async function fetchHrvData(
  accessToken,
  startDate,
  endDate,
  userId,
  fitbitUserId = null,
  userAuthToken
) {
  try {
    const auth = await getFitbitAuthData(userId, accessToken, fitbitUserId);

    if (auth.error) {
      return auth;
    }

    // const response = await axios.get(
    //   `https://api.fitbit.com/1/user/${auth.fitbitUserId}/hrv/date/${startDate}/${endDate}/all.json`,
    //   {
    //     headers: {
    //       Authorization: `Bearer ${auth.accessToken}`,
    //     },
    //   }
    // );
    const response = {
      hrv: [
        {
          minutes: [
            {
              minute: "2021-10-25T09:10:00.000",
              value: {
                rmssd: 26.617,
                coverage: 0.935,
                hf: 126.514,
                lf: 471.897,
              },
            },
            {
              minute: "2021-10-25T09:15:00.000",
              value: {
                rmssd: 34.845,
                coverage: 0.988,
                hf: 344.342,
                lf: 1422.947,
              },
            },
            {
              minute: "2021-10-25T09:20:00.000",
              value: {
                rmssd: 36.893,
                coverage: 0.981,
                hf: 328.704,
                lf: 298.071,
              },
            },
            {
              minute: "2021-10-25T09:25:00.000",
              value: {
                rmssd: 65.946,
                coverage: 0.972,
                hf: 1088.794,
                lf: 979.685,
              },
            },
          ],
          dateTime: "2021-10-25",
        },
      ],
    };

    if (response.data && response.data.hrv && response.data.hrv.length > 0) {
      await storeHrvData(
        response.data.hrv,
        userId,
        auth.accessToken,
        userAuthToken
      );
    }

    return response.data;
  } catch (error) {
    errorLog("Error fetching HRV data:", error.message);
    throw error;
  }
}

async function fetchCardioScore(
  accessToken,
  date,
  userId,
  fitbitUserId = null,
  userAuthToken
) {
  try {
    const auth = await getFitbitAuthData(userId, accessToken, fitbitUserId);

    if (auth.error) {
      return auth;
    }

    const response = await axios.get(
      `https://api.fitbit.com/1/user/${auth.fitbitUserId}/cardioscore/date/${date}.json`,
      {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
        },
      }
    );

    if (
      response.data &&
      response.data.cardioScore &&
      response.data.cardioScore.length > 0
    ) {
      await storeCardioScore(
        response.data.cardioScore[0],
        userId,
        auth.accessToken,
        date,
        userAuthToken
      );
    }

    return response.data;
  } catch (error) {
    errorLog("Error fetching cardio score:", error.message);
    throw error;
  }
}

module.exports = {
  fetchSleepDataRange,
  fetchActivities, // Now also handles steps and distance data
  fetchStepsData,
  fetchDistanceData,
  fetchSpO2Data,
  fetchHeartRateData,
  validateAndTransformActivityData,
  fetchActivitySummary,
  fetchSkinTemperature,
  fetchBreathingRate,
  fetchHrvData,
  fetchCardioScore,
  processHealthConnectData,
  processHealthConnectActivityData,
  processHealthConnectSleepData,
  validateAndTransformHealthConnectData,
  validateAndTransformHealthConnectSleepData,
  processManualActivityData,
  processManualSleepData,
  validateAndTransformManualActivityData,
  validateAndTransformManualSleepData,
};
