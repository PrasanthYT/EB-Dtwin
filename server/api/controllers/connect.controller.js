const fitbitService = require("../../services/connect/wearable_connect");
const axios = require("axios");
const { info, errorLog } = require("@dtwin/config");
const fitbitConfig = require("../../common/config/fitbit.config");
const userProfileService = require("../../services/user/userProfileService");
const { verifyToken } = require("@dtwin/config");
const timezoneUtils = require("../../common/utils/timezone");

async function initiateFitbitOAuth(req, res) {
  try {
    const jwtToken = req.headers.authorization.split(" ")[1];
    const state = Buffer.from(JSON.stringify({ token: jwtToken })).toString(
      "base64"
    );
    const scopes = [
      "activity",
      "cardio_fitness",
      "electrocardiogram",
      "heartrate",
      "location",
      "nutrition",
      "oxygen_saturation",
      "profile",
      "respiratory_rate",
      "settings",
      "sleep",
      "social",
      "temperature",
      "weight",
    ];
    const authUrl = `${
      fitbitConfig.FITBIT_AUTH_URL
    }?response_type=code&client_id=${
      fitbitConfig.CLIENT_ID
    }&redirect_uri=${encodeURIComponent(
      fitbitConfig.REDIRECT_URI
    )}&scope=${encodeURIComponent(scopes.join(" "))}&state=${encodeURIComponent(
      state
    )}&expires_in=604800`;

    res.status(200).json({
      success: true,
      authUrl: authUrl,
      userId: req.user.userId,
      message:
        "Redirect the user to this URL to authorize the Fitbit connection",
    });
  } catch (error) {
    errorLog("Error initiating Fitbit OAuth:", error);
    res.status(500).json({
      success: false,
      message: "Failed to initiate Fitbit connection",
      error: error.message,
    });
  }
}

async function fitbitOAuthCallback(req, res) {
  try {
    const code = req.query.code ? req.query.code.split("#")[0] : null;

    let userId = null;
    let jwtToken = null;

    if (req.query.state) {
      try {
        const stateData = JSON.parse(
          Buffer.from(req.query.state, "base64").toString()
        );
        jwtToken = stateData.token;
        const decoded = verifyToken(jwtToken);
        userId = decoded.userId;
      } catch (error) {
        errorLog("Error verifying token from state parameter:", error);
      }
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Authorization code is missing",
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token in state parameter",
      });
    }

    const tokenResponse = await axios.post(
      fitbitConfig.FITBIT_TOKEN_URL,
      new URLSearchParams({
        client_id: fitbitConfig.CLIENT_ID,
        grant_type: "authorization_code",
        code,
        redirect_uri: fitbitConfig.REDIRECT_URI,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${fitbitConfig.CLIENT_ID}:${fitbitConfig.CLIENT_SECRET}`
          ).toString("base64")}`,
        },
      }
    );

    const { access_token, refresh_token, expires_in, user_id } =
      tokenResponse.data;
    console.log(tokenResponse.data);
    await userProfileService.saveFitbitAuth(userId, {
      access_token,
      refresh_token,
      expires_in,
      user_id,
    });
    const resp = await axios.patch(
      `http://localhost:4000/api/profiles`,
      {
        userId,
        hasWatch: true,
      },
      {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
      }
    );
    res.status(200).json({
      success: true,
      message: "Successfully connected Fitbit account",
    });
  } catch (error) {
    errorLog("Error in Fitbit OAuth callback:", error);

    const errorMessage = error.response?.data?.errors
      ? `Fitbit API error: ${JSON.stringify(error.response.data.errors)}`
      : error.message;

    res.status(500).json({
      success: false,
      message: "Failed to connect Fitbit account",
      error: errorMessage,
    });
  }
}

async function saveInitialActivityData(req, res) {
  try {
    const userId = req.user.userId;
    const fitbitAuth = await userProfileService.getFitbitAuth(userId);
    const accessToken = fitbitAuth.accessToken;
    const fitbitUserId = fitbitAuth.userId || null;
    const userAuthToken = req.headers.authorization?.split(" ")[1];

    const startDate = timezoneUtils.formatISTDate(
      timezoneUtils.subtractMonths(1)
    );

    const activityData = await fitbitService.fetchActivities(
      accessToken,
      startDate,
      100,
      0,
      userId,
      fitbitUserId,
      false,
      userAuthToken
    );

    res.status(200).json({
      success: true,
      message: "Successfully synced activities",
      data: activityData,
    });
  } catch (error) {
    errorLog("Error saving initial activity data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save initial activity data",
      error: error.message,
    });
  }
}

async function saveInitialSleepData(req, res) {
  try {
    const userId = req.user.userId;
    const fitbitAuth = await userProfileService.getFitbitAuth(userId);
    const accessToken = fitbitAuth.accessToken;
    const fitbitUserId = fitbitAuth.userId || null;
    const userAuthToken = req.headers.authorization?.split(" ")[1];

    // Get date from 1 month ago and today in IST (YYYY-MM-DD)
    const startDate = timezoneUtils.formatISTDate(
      timezoneUtils.subtractMonths(2)
    );
    const endDate = timezoneUtils.getCurrentISTDate();

    const sleepData = await fitbitService.fetchSleepDataRange(
      accessToken,
      startDate,
      endDate,
      userId,
      fitbitUserId,
      userAuthToken
    );

    res.status(200).json({
      success: true,
      message: "Successfully synced sleep data",
      data: sleepData,
    });
  } catch (error) {
    errorLog("Error saving initial sleep data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save initial sleep data",
      error: error.message,
    });
  }
}

async function syncDailyActivityData(req, res) {
  try {
    const userId = req.user.userId;
    const fitbitAuth = await userProfileService.getFitbitAuth(userId);

    if (!fitbitAuth || !fitbitAuth.accessToken) {
      return res.status(400).json({
        success: false,
        message: "Fitbit not connected. Please connect Fitbit first.",
      });
    }

    const accessToken = fitbitAuth.accessToken;
    const fitbitUserId = fitbitAuth.userId || null;
    const userAuthToken = req.headers.authorization?.split(" ")[1];
    const lastSync = fitbitAuth.lastSync || timezoneUtils.subtractDays(1);
    const syncFromDate = timezoneUtils.formatISTDate(lastSync);

    const activityData = await fitbitService.fetchActivities(
      accessToken,
      syncFromDate,
      50,
      0,
      userId,
      fitbitUserId,
      false,
      userAuthToken
    );

    await userProfileService.updateFitbitLastSync(userId);

    res.status(200).json({
      success: true,
      message: "Successfully synced activities",
      data: activityData,
    });
  } catch (error) {
    errorLog("Error syncing daily activity data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to sync daily activity data",
      error: error.message,
    });
  }
}

async function syncDailySleepData(req, res) {
  try {
    const userId = req.user.userId;

    const fitbitAuth = await userProfileService.getFitbitAuth(userId);
    info(fitbitAuth);
    if (!fitbitAuth || !fitbitAuth.accessToken) {
      return res.status(400).json({
        success: false,
        message: "Fitbit not connected. Please connect Fitbit first.",
      });
    }

    const accessToken = fitbitAuth.accessToken;
    const fitbitUserId = fitbitAuth.userId || null;
    const lastSync = fitbitAuth.lastSync || timezoneUtils.subtractDays(1);
    const syncFromDate = lastSync.split("T")[0];
    const today = timezoneUtils.getCurrentISTDate();
    const userAuthToken = req.headers.authorization?.split(" ")[1];

    if (!userAuthToken) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No token provided" });
    }

    const sleepData = await fitbitService.fetchSleepDataRange(
      accessToken,
      syncFromDate,
      today,
      userId,
      fitbitUserId,
      userAuthToken
    );

    await userProfileService.updateFitbitLastSync(userId);

    res.status(200).json({
      success: true,
      message: "Successfully synced sleep data",
      data: sleepData,
    });
  } catch (error) {
    errorLog("Error syncing daily sleep data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to sync daily sleep data",
      error: error.message,
    });
  }
}

async function syncDailySPO2Data(req, res) {
  try {
    const userId = req.user.userId;
    const fitbitAuth = await userProfileService.getFitbitAuth(userId);

    if (!fitbitAuth || !fitbitAuth.accessToken) {
      return res.status(400).json({
        success: false,
        message: "Fitbit not connected. Please connect Fitbit first.",
      });
    }

    const accessToken = fitbitAuth.accessToken;
    const fitbitUserId = fitbitAuth.userId || null;
    const userAuthToken = req.headers.authorization?.split(" ")[1];
    const lastSync = fitbitAuth.lastSync || timezoneUtils.subtractDays(1);
    const syncFromDate = lastSync.split("T")[0];
    const today = timezoneUtils.getCurrentISTDate();

    const spo2Data = await fitbitService.fetchSpO2Data(
      accessToken,
      syncFromDate,
      today,
      userId,
      fitbitUserId,
      userAuthToken
    );

    await userProfileService.updateFitbitLastSync(userId);

    res.status(200).json({
      success: true,
      message: "Successfully synced SpO2 data",
      data: spo2Data,
    });
  } catch (error) {
    errorLog("Error syncing daily SpO2 data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to sync daily SpO2 data",
      error: error.message,
    });
  }
}

async function syncDailyStepsData(req, res) {
  try {
    const userId = req.user.userId;
    const fitbitAuth = await userProfileService.getFitbitAuth(userId);
    if (!fitbitAuth || !fitbitAuth.accessToken) {
      return res.status(400).json({
        success: false,
        message: "Fitbit not connected. Please connect Fitbit first.",
      });
    }

    const accessToken = fitbitAuth.accessToken;
    const fitbitUserId = fitbitAuth.userId || null;
    const userAuthToken = req.headers.authorization?.split(" ")[1];
    const lastSync = fitbitAuth.lastSync || timezoneUtils.subtractDays(1);
    const syncFromDate = lastSync.split("T")[0];
    const today = timezoneUtils.getCurrentISTDate();
    const stepsData = await fitbitService.fetchStepsData(
      accessToken,
      syncFromDate,
      today,
      userId,
      fitbitUserId,
      userAuthToken
    );

    await userProfileService.updateFitbitLastSync(userId);

    res.status(200).json({
      success: true,
      message: "Successfully synced steps data",
      data: stepsData,
    });
  } catch (error) {
    errorLog("Error syncing daily steps data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to sync daily steps data",
      error: error.message,
    });
  }
}

async function syncDailyDistanceData(req, res) {
  try {
    const userId = req.user.userId;
    const fitbitAuth = await userProfileService.getFitbitAuth(userId);

    if (!fitbitAuth || !fitbitAuth.accessToken) {
      return res.status(400).json({
        success: false,
        message: "Fitbit not connected. Please connect Fitbit first.",
      });
    }

    const accessToken = fitbitAuth.accessToken;
    const fitbitUserId = fitbitAuth.userId || null;
    const userAuthToken = req.headers.authorization?.split(" ")[1];
    const lastSync = fitbitAuth.lastSync || timezoneUtils.subtractDays(1);
    const syncFromDate = lastSync.split("T")[0];
    const today = timezoneUtils.getCurrentISTDate();

    const distanceData = await fitbitService.fetchDistanceData(
      accessToken,
      syncFromDate,
      today,
      userId,
      fitbitUserId,
      userAuthToken
    );

    await userProfileService.updateFitbitLastSync(userId);

    res.status(200).json({
      success: true,
      message: "Successfully synced distance data",
      data: distanceData,
    });
  } catch (error) {
    errorLog("Error syncing daily distance data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to sync daily distance data",
      error: error.message,
    });
  }
}

async function saveHealthConnectData(req, res) {
  try {
    const userId = req.user.userId;
    const healthData = req.body;

    if (!healthData) {
      return res.status(400).json({
        success: false,
        message: "No health data provided",
      });
    }

    const userAuthToken = req.headers.authorization?.split(" ")[1];

    if (!userAuthToken) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
      });
    }

    const result = {
      activity: null,
      sleep: null,
    };

    // Check if activity data exists and process it
    if (
      healthData.activityData ||
      healthData.activity_type ||
      healthData.steps ||
      healthData.calories_burned
    ) {
      result.activity = await fitbitService.processHealthConnectActivityData(
        healthData,
        userId,
        userAuthToken
      );
    }

    // Check if sleep data exists and process it
    if (
      healthData.sleepData ||
      healthData.startTime ||
      healthData.sleepStages
    ) {
      result.sleep = await fitbitService.processHealthConnectSleepData(
        healthData,
        userId,
        userAuthToken
      );
    }

    res.status(200).json({
      success: true,
      message: "Successfully processed Health Connect data",
      data: result,
    });
  } catch (error) {
    errorLog("Error processing Health Connect data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process Health Connect data",
      error: error.message,
    });
  }
}

async function saveManualEntryData(req, res) {
  try {
    const userId = req.user.userId;
    const entryData = req.body;

    if (!entryData || (!entryData.activity && !entryData.sleep)) {
      return res.status(400).json({
        success: false,
        message: "No activity or sleep data provided",
      });
    }

    const userAuthToken = req.headers.authorization?.split(" ")[1];

    if (!userAuthToken) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
      });
    }

    const result = {
      activity: null,
      sleep: null,
    };

    // Process activity data if available
    if (entryData.activity) {
      result.activity = await fitbitService.processManualActivityData(
        entryData.activity,
        userId,
        userAuthToken
      );
    }

    // Process sleep data if available
    if (entryData.sleep) {
      result.sleep = await fitbitService.processManualSleepData(
        entryData.sleep,
        userId,
        userAuthToken
      );
    }

    res.status(200).json({
      success: true,
      message: "Successfully processed manual entry data",
      data: result,
    });
  } catch (error) {
    errorLog("Error processing manual entry data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process manual entry data",
      error: error.message,
    });
  }
}

async function saveHealthConnectActivityData(req, res) {
  try {
    const userId = req.user.userId;
    const activityData = req.body;

    if (!activityData) {
      return res.status(400).json({
        success: false,
        message: "No activity data provided",
      });
    }

    const userAuthToken = req.headers.authorization?.split(" ")[1];

    if (!userAuthToken) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
      });
    }

    // Use the dedicated function for processing Health Connect activity data
    const result = await fitbitService.processHealthConnectActivityData(
      activityData,
      userId,
      userAuthToken
    );

    res.status(200).json({
      success: true,
      message: "Successfully processed Health Connect activity data",
      data: result,
    });
  } catch (error) {
    errorLog("Error processing Health Connect activity data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process Health Connect activity data",
      error: error.message,
    });
  }
}

async function saveHealthConnectSleepData(req, res) {
  try {
    const userId = req.user.userId;
    const sleepData = req.body;

    if (!sleepData) {
      return res.status(400).json({
        success: false,
        message: "No sleep data provided",
      });
    }

    const userAuthToken = req.headers.authorization?.split(" ")[1];

    if (!userAuthToken) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
      });
    }

    // Use the dedicated function for processing Health Connect sleep data
    const result = await fitbitService.processHealthConnectSleepData(
      sleepData,
      userId,
      userAuthToken
    );

    res.status(200).json({
      success: true,
      message: "Successfully processed Health Connect sleep data",
      data: result,
    });
  } catch (error) {
    errorLog("Error processing Health Connect sleep data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process Health Connect sleep data",
      error: error.message,
    });
  }
}

async function saveManualActivityData(req, res) {
  try {
    const userId = req.user.userId;
    const activityData = req.body;

    if (!activityData) {
      return res.status(400).json({
        success: false,
        message: "No activity data provided",
      });
    }

    const userAuthToken = req.headers.authorization?.split(" ")[1];

    if (!userAuthToken) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
      });
    }

    // Use the specialized function for manual activity data
    const result = await fitbitService.processManualActivityData(
      activityData,
      userId,
      userAuthToken
    );

    res.status(200).json({
      success: true,
      message: "Successfully processed manual activity data",
      data: result,
    });
  } catch (error) {
    errorLog("Error processing manual activity data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process manual activity data",
      error: error.message,
    });
  }
}

async function saveManualSleepData(req, res) {
  try {
    const userId = req.user.userId;
    const sleepData = req.body;

    if (!sleepData) {
      return res.status(400).json({
        success: false,
        message: "No sleep data provided",
      });
    }

    const userAuthToken = req.headers.authorization?.split(" ")[1];

    if (!userAuthToken) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
      });
    }

    // Use the specialized function for manual sleep data
    const result = await fitbitService.processManualSleepData(
      sleepData,
      userId,
      userAuthToken
    );

    res.status(200).json({
      success: true,
      message: "Successfully processed manual sleep data",
      data: result,
    });
  } catch (error) {
    errorLog("Error processing manual sleep data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process manual sleep data",
      error: error.message,
    });
  }
}

async function syncDailyHeartRateData(req, res) {
  try {
    const userId = req.user.userId;
    const fitbitAuth = await userProfileService.getFitbitAuth(userId);

    if (!fitbitAuth || !fitbitAuth.accessToken) {
      return res.status(400).json({
        success: false,
        message: "Fitbit not connected. Please connect Fitbit first.",
      });
    }

    const accessToken = fitbitAuth.accessToken;
    const fitbitUserId = fitbitAuth.userId || null;
    const userAuthToken = req.headers.authorization?.split(" ")[1];
    const lastSync = fitbitAuth.lastSync || timezoneUtils.subtractDays(1);
    const syncFromDate = timezoneUtils.formatISTDate(lastSync);
    const today = timezoneUtils.getCurrentISTDate();

    const heartRateData = await fitbitService.fetchHeartRateData(
      accessToken,
      today,
      userId,
      fitbitUserId,
      userAuthToken
    );

    await userProfileService.updateFitbitLastSync(userId);

    res.status(200).json({
      success: true,
      message: "Successfully synced heart rate data",
      data: heartRateData,
    });
  } catch (error) {
    errorLog("Error syncing daily heart rate data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to sync daily heart rate data",
      error: error.message,
    });
  }
}

async function syncActivitySummary(req, res) {
  try {
    const userId = req.user.userId;
    const fitbitAuth = await userProfileService.getFitbitAuth(userId);

    if (!fitbitAuth || !fitbitAuth.accessToken) {
      return res.status(400).json({
        success: false,
        message: "Fitbit not connected. Please connect Fitbit first.",
      });
    }

    const accessToken = fitbitAuth.accessToken;
    const fitbitUserId = fitbitAuth.userId || null;
    const userAuthToken = req.headers.authorization?.split(" ")[1];
    const today = timezoneUtils.getCurrentISTDate();

    const activitySummary = await fitbitService.fetchActivitySummary(
      accessToken,
      today,
      userId,
      fitbitUserId,
      userAuthToken
    );

    await userProfileService.updateFitbitLastSync(userId);

    res.status(200).json({
      success: true,
      message: "Successfully synced activity summary",
      data: activitySummary,
    });
  } catch (error) {
    errorLog("Error syncing activity summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to sync activity summary",
      error: error.message,
    });
  }
}

async function syncSkinTemperature(req, res) {
  try {
    const userId = req.user.userId;
    const fitbitAuth = await userProfileService.getFitbitAuth(userId);

    if (!fitbitAuth || !fitbitAuth.accessToken) {
      return res.status(400).json({
        success: false,
        message: "Fitbit not connected. Please connect Fitbit first.",
      });
    }

    const accessToken = fitbitAuth.accessToken;
    const fitbitUserId = fitbitAuth.userId || null;
    const userAuthToken = req.headers.authorization?.split(" ")[1];
    const today = timezoneUtils.getCurrentISTDate();

    const skinTempData = await fitbitService.fetchSkinTemperature(
      accessToken,
      today,
      userId,
      fitbitUserId,
      userAuthToken
    );

    await userProfileService.updateFitbitLastSync(userId);

    res.status(200).json({
      success: true,
      message: "Successfully synced skin temperature",
      data: skinTempData,
    });
  } catch (error) {
    errorLog("Error syncing skin temperature:", error);
    res.status(500).json({
      success: false,
      message: "Failed to sync skin temperature",
      error: error.message,
    });
  }
}

async function syncBreathingRate(req, res) {
  try {
    const userId = req.user.userId;
    const fitbitAuth = await userProfileService.getFitbitAuth(userId);

    if (!fitbitAuth || !fitbitAuth.accessToken) {
      return res.status(400).json({
        success: false,
        message: "Fitbit not connected. Please connect Fitbit first.",
      });
    }

    const accessToken = fitbitAuth.accessToken;
    const fitbitUserId = fitbitAuth.userId || null;
    const userAuthToken = req.headers.authorization?.split(" ")[1];
    const today = timezoneUtils.getCurrentISTDate();

    const breathingRateData = await fitbitService.fetchBreathingRate(
      accessToken,
      today,
      userId,
      fitbitUserId,
      userAuthToken
    );

    await userProfileService.updateFitbitLastSync(userId);

    res.status(200).json({
      success: true,
      message: "Successfully synced breathing rate",
      data: breathingRateData,
    });
  } catch (error) {
    errorLog("Error syncing breathing rate:", error);
    res.status(500).json({
      success: false,
      message: "Failed to sync breathing rate",
      error: error.message,
    });
  }
}

async function syncHrvData(req, res) {
  try {
    const userId = req.user.userId;
    const fitbitAuth = await userProfileService.getFitbitAuth(userId);

    if (!fitbitAuth || !fitbitAuth.accessToken) {
      return res.status(400).json({
        success: false,
        message: "Fitbit not connected. Please connect Fitbit first.",
      });
    }

    const accessToken = fitbitAuth.accessToken;
    const fitbitUserId = fitbitAuth.userId || null;
    const userAuthToken = req.headers.authorization?.split(" ")[1];

    // Get date range for HRV data (last 7 days)
    const endDate = timezoneUtils.getCurrentISTDate();
    const startDate = timezoneUtils.formatISTDate(
      timezoneUtils.subtractDays(7)
    );

    const hrvData = await fitbitService.fetchHrvData(
      accessToken,
      startDate,
      endDate,
      userId,
      fitbitUserId,
      userAuthToken
    );

    await userProfileService.updateFitbitLastSync(userId);

    res.status(200).json({
      success: true,
      message: "Successfully synced HRV data",
      data: hrvData,
    });
  } catch (error) {
    errorLog("Error syncing HRV data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to sync HRV data",
      error: error.message,
    });
  }
}

async function syncCardioScore(req, res) {
  try {
    const userId = req.user.userId;
    const fitbitAuth = await userProfileService.getFitbitAuth(userId);

    if (!fitbitAuth || !fitbitAuth.accessToken) {
      return res.status(400).json({
        success: false,
        message: "Fitbit not connected. Please connect Fitbit first.",
      });
    }

    const accessToken = fitbitAuth.accessToken;
    const fitbitUserId = fitbitAuth.userId || null;
    const userAuthToken = req.headers.authorization?.split(" ")[1];
    const today = timezoneUtils.getCurrentISTDate();

    const cardioScoreData = await fitbitService.fetchCardioScore(
      accessToken,
      today,
      userId,
      fitbitUserId,
      userAuthToken
    );

    await userProfileService.updateFitbitLastSync(userId);

    res.status(200).json({
      success: true,
      message: "Successfully synced cardio score",
      data: cardioScoreData,
    });
  } catch (error) {
    errorLog("Error syncing cardio score:", error);
    res.status(500).json({
      success: false,
      message: "Failed to sync cardio score",
      error: error.message,
    });
  }
}


// helper: iterate dates between two ISO dates (inclusive)
function eachDate(startDate, endDate) {
  const dates = [];
  let curr = new Date(startDate);
  const last = new Date(endDate);
  while (curr <= last) {
    dates.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

// generic initial‐range handler factory
function makeInitialHandler(fetchFn) {
  return async (req, res) => {
    try {
      const userId       = req.user.userId;
      const { accessToken, refreshToken, expires_in, user_id: fitbitUserId } =
        await userProfileService.getFitbitAuth(userId);
      const authToken    = req.headers.authorization.split(' ')[1];
      const endDate      = timezoneUtils.getCurrentISTDate();
      const startDate    = timezoneUtils.formatISTDate(timezoneUtils.subtractDays(29));
      const dates        = eachDate(startDate, endDate);

      const results = [];
      for (const date of dates) {
        // e.g. fetchFn(accessToken, date, userId, fitbitUserId, authToken)
        const r = await fetchFn(accessToken, date, userId, fitbitUserId, authToken);
        results.push(r);
      }

      res.status(200).json({
        success: true,
        message: `Successfully fetched 30d of ${fetchFn.name}`,
        data: results
      });
    } catch (err) {
      errorLog(`Error in ${fetchFn.name} initial:`, err);
      res.status(500).json({ success: false, message: err.message });
    }
  };
}

// individual 30-day endpoints
const saveInitialStepsData              = makeInitialHandler(fitbitService.fetchStepsData);
const saveInitialDistanceData           = makeInitialHandler(fitbitService.fetchDistanceData);
const saveInitialSPO2Data               = makeInitialHandler(fitbitService.fetchSpO2Data);
const saveInitialHeartRateData          = makeInitialHandler(fitbitService.fetchHeartRateData);
const saveInitialActivitySummaryData    = makeInitialHandler(fitbitService.fetchActivitySummary);
const saveInitialSkinTemperatureData    = makeInitialHandler(fitbitService.fetchSkinTemperature);
const saveInitialBreathingRateData      = makeInitialHandler(fitbitService.fetchBreathingRate);
const saveInitialCardioScoreData        = makeInitialHandler(fitbitService.fetchCardioScore);
const saveInitialHrvData                = makeInitialHandler(async (accessToken, date, userId, fitbitUserId, authToken) => {
  // HRV returns an array of day‐objects
  return fitbitService.fetchHrvData(accessToken, date, userId, fitbitUserId, authToken);
});

// “Run them all” in sequence:
const syncMonthlyData = async (req, res) => {
  try {
    const userId = req.user.userId;
    const fitbitAuth = await userProfileService.getFitbitAuth(userId);
    console.log("Fitbit Auth:", fitbitAuth, userId);
    if (!fitbitAuth || !fitbitAuth.accessToken) {
      return res.status(400).json({
        success: false,
        message: "Fitbit not connected. Please connect Fitbit first.",
      });
    }

    const accessToken = fitbitAuth.accessToken;
    const fitbitUserId = fitbitAuth.userId || null;
    const userAuthToken = req.headers.authorization?.split(" ")[1];
    
    // Get date range (last 30 days)
    const endDate = timezoneUtils.getCurrentISTDate();
    const startDate = timezoneUtils.formatISTDate(timezoneUtils.subtractDays(29));
    const dates = eachDate(startDate, endDate);

    // Object to store all results
    const results = {
      steps: [],
      distance: [],
      spo2: [],
      heartRate: [],
      activitySummary: [],
      skinTemperature: [],
      breathingRate: [],
      hrv: [],
      cardioScore: []
    };

    // Process each data type in sequence
    // 1. Steps data
    for (const date of dates) {
      const data = await fitbitService.fetchStepsData(
        accessToken,
        date,
        userId,
        fitbitUserId,
        userAuthToken
      );
      results.steps.push(data);
    }

    // 2. Distance data
    for (const date of dates) {
      const data = await fitbitService.fetchDistanceData(
        accessToken,
        date,
        userId,
        fitbitUserId,
        userAuthToken
      );
      results.distance.push(data);
    }

    // 3. SPO2 data
    for (const date of dates) {
      const data = await fitbitService.fetchSpO2Data(
        accessToken,
        date,
        userId,
        fitbitUserId,
        userAuthToken
      );
      results.spo2.push(data);
    }

    // 4. Heart rate data
    // for (const date of dates) {
    //   const data = await fitbitService.fetchHeartRateData(
    //     accessToken,
    //     date,
    //     userId,
    //     fitbitUserId,
    //     userAuthToken
    //   );
    //   results.heartRate.push(data);
    // }

    // 5. Activity summary
    // for (const date of dates) {
    //   const data = await fitbitService.fetchActivitySummary(
    //     accessToken,
    //     date,
    //     userId,
    //     fitbitUserId,
    //     userAuthToken
    //   );
    //   results.activitySummary.push(data);
    // }

    // 6. Skin temperature
    // for (const date of dates) {
    //   const data = await fitbitService.fetchSkinTemperature(
    //     accessToken,
    //     date,
    //     userId,
    //     fitbitUserId,
    //     userAuthToken
    //   );
    //   results.skinTemperature.push(data);
    // }

    // 7. Breathing rate
    // for (const date of dates) {
    //   const data = await fitbitService.fetchBreathingRate(
    //     accessToken,
    //     date,
    //     userId,
    //     fitbitUserId,
    //     userAuthToken
    //   );
    //   results.breathingRate.push(data);
    // }

    // 8. HRV data (fetched as range)
    // const hrvData = await fitbitService.fetchHrvData(
    //   accessToken,
    //   startDate,
    //   endDate,
    //   userId,
    //   fitbitUserId,
    //   userAuthToken
    // );
    // results.hrv = hrvData;

    // 9. Cardio score
    // for (const date of dates) {
    //   const data = await fitbitService.fetchCardioScore(
    //     accessToken,
    //     date,
    //     userId,
    //     fitbitUserId,
    //     userAuthToken
    //   );
    //   results.cardioScore.push(data);
    // }

    // Update last sync time
    await userProfileService.updateFitbitLastSync(userId);

    res.status(200).json({
      success: true,
      message: "Successfully synced all monthly data",
      data: results
    });
  } catch (error) {
    console.log("Error in monthly sync:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to complete monthly sync",
      error: error.message,
    });
  }
};

module.exports = {
  initiateFitbitOAuth,
  saveInitialActivityData,
  saveInitialSleepData,
  syncDailyActivityData,
  syncDailySleepData,
  fitbitOAuthCallback,
  syncDailyStepsData,
  syncDailyDistanceData,
  syncDailySPO2Data,
  syncDailyHeartRateData,
  syncActivitySummary,
  syncSkinTemperature,
  syncBreathingRate,
  syncHrvData,
  syncCardioScore,
  saveHealthConnectData,
  saveManualEntryData,
  saveHealthConnectActivityData,
  saveHealthConnectSleepData,
  saveManualActivityData,
  saveManualSleepData,
  saveInitialStepsData,
  saveInitialDistanceData,
  saveInitialSPO2Data,
  saveInitialHeartRateData,
  saveInitialActivitySummaryData,
  saveInitialSkinTemperatureData,
  saveInitialBreathingRateData,
  saveInitialCardioScoreData,
  saveInitialHrvData,
  syncMonthlyData
};
