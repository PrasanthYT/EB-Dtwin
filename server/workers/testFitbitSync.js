const {
  syncSleepData,
  syncActivityData,
  syncStepsData,
  syncDistanceData,
  syncSPO2Data,
  syncHeartRateData,
  refreshFitbitTokens
} = require('./fitbitSyncWorker');

/**
 * Test script for fitbitSyncWorker
 * 
 * Run with: node testFitbitSync.js [function]
 * 
 * where [function] is one of:
 * - all (default): test all functions
 * - sleep: test sleep sync
 * - activity: test activity sync
 * - steps: test steps sync
 * - distance: test distance sync
 * - spo2: test SpO2 sync
 * - heart: test heart rate sync
 * - tokens: test token refresh
 */

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Helper to log with colors
const log = {
  info: (message) => console.log(`${colors.blue}[INFO]${colors.reset} ${message}`),
  success: (message) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`),
  error: (message) => console.log(`${colors.red}[ERROR]${colors.reset} ${message}`),
  warn: (message) => console.log(`${colors.yellow}[WARN]${colors.reset} ${message}`),
  title: (message) => console.log(`\n${colors.cyan}=== ${message} ===${colors.reset}\n`)
};

// Test each function individually
async function testSleepSync() {
  log.title('Testing Sleep Data Sync');
  try {
    await syncSleepData();
    log.success('Sleep data sync completed successfully');
    return true;
  } catch (error) {
    log.error(`Sleep data sync failed: ${error.message}`);
    console.error(error);
    return false;
  }
}

async function testActivitySync() {
  log.title('Testing Activity Data Sync');
  try {
    await syncActivityData();
    log.success('Activity data sync completed successfully');
    return true;
  } catch (error) {
    log.error(`Activity data sync failed: ${error.message}`);
    console.error(error);
    return false;
  }
}

async function testStepsSync() {
  log.title('Testing Steps Data Sync');
  try {
    await syncStepsData();
    log.success('Steps data sync completed successfully');
    return true;
  } catch (error) {
    log.error(`Steps data sync failed: ${error.message}`);
    console.error(error);
    return false;
  }
}

async function testDistanceSync() {
  log.title('Testing Distance Data Sync');
  try {
    await syncDistanceData();
    log.success('Distance data sync completed successfully');
    return true;
  } catch (error) {
    log.error(`Distance data sync failed: ${error.message}`);
    console.error(error);
    return false;
  }
}

async function testSPO2Sync() {
  log.title('Testing SPO2 Data Sync');
  try {
    await syncSPO2Data();
    log.success('SPO2 data sync completed successfully');
    return true;
  } catch (error) {
    log.error(`SPO2 data sync failed: ${error.message}`);
    console.error(error);
    return false;
  }
}

async function testHeartRateSync() {
  log.title('Testing Heart Rate Data Sync');
  try {
    await syncHeartRateData();
    log.success('Heart rate data sync completed successfully');
    return true;
  } catch (error) {
    log.error(`Heart rate data sync failed: ${error.message}`);
    console.error(error);
    return false;
  }
}

async function testTokenRefresh() {
  log.title('Testing Fitbit Token Refresh');
  try {
    await refreshFitbitTokens();
    log.success('Token refresh completed successfully');
    return true;
  } catch (error) {
    log.error(`Token refresh failed: ${error.message}`);
    console.error(error);
    return false;
  }
}

// Run all tests
async function testAll() {
  log.title('STARTING COMPREHENSIVE FITBIT SYNC TEST');
  
  const results = {
    sleep: await testSleepSync(),
    activity: await testActivitySync(),
    steps: await testStepsSync(),
    distance: await testDistanceSync(),
    spo2: await testSPO2Sync(),
    heart: await testHeartRateSync(),
    tokens: await testTokenRefresh()
  };
  
  // Print summary
  log.title('TEST RESULTS SUMMARY');
  
  let allPassed = true;
  Object.entries(results).forEach(([test, passed]) => {
    if (passed) {
      log.success(`${test.toUpperCase()}: PASSED`);
    } else {
      log.error(`${test.toUpperCase()}: FAILED`);
      allPassed = false;
    }
  });
  
  if (allPassed) {
    log.title('ALL TESTS PASSED SUCCESSFULLY');
  } else {
    log.title('SOME TESTS FAILED');
  }
  
  return allPassed;
}

// Parse command line arguments
async function run() {
  const arg = process.argv[2] || 'all';
  
  switch (arg.toLowerCase()) {
    case 'sleep':
      await testSleepSync();
      break;
    case 'activity':
      await testActivitySync();
      break;
    case 'steps':
      await testStepsSync();
      break;
    case 'distance':
      await testDistanceSync();
      break;
    case 'spo2':
      await testSPO2Sync();
      break;
    case 'heart':
      await testHeartRateSync();
      break;
    case 'tokens':
      await testTokenRefresh();
      break;
    case 'all':
    default:
      await testAll();
      break;
  }
}

// If this script is run directly, run the tests
if (require.main === module) {
  run().catch(error => {
    log.error('Test script error:');
    console.error(error);
    process.exit(1);
  });
}

// Export functions for use in other scripts
module.exports = {
  testSleepSync,
  testActivitySync,
  testStepsSync,
  testDistanceSync,
  testSPO2Sync,
  testHeartRateSync,
  testTokenRefresh,
  testAll
}; 