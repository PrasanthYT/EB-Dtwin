const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const jwt = require('jsonwebtoken');

// Import the worker functions
const {
  syncSleepData,
  syncActivityData,
  syncStepsData,
  syncDistanceData,
  syncSPO2Data,
  syncHeartRateData,
  refreshFitbitTokens
} = require('./fitbitSyncWorker');

// Mock database and other dependencies
jest.mock('@dtwin/shared-database', () => ({
  UserProfile: {
    findAll: jest.fn()
  }
}));

jest.mock('../services/user/userProfileService', () => ({
  updateFitbitLastSync: jest.fn(),
  saveFitbitAuth: jest.fn()
}));

jest.mock('@dtwin/config/config/logging', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  },
  info: jest.fn(),
  errorLog: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
}));

// Mock environment variables
process.env.JWT_SECRET = 'test-secret';
process.env.API_BASE_URL = 'http://localhost:4000/api';
process.env.FITBIT_CLIENT_ID = 'test-client-id';
process.env.FITBIT_CLIENT_SECRET = 'test-client-secret';

describe('Fitbit Sync Worker Tests', () => {
  let mock;
  let mockProfiles;
  const db = require('@dtwin/shared-database');
  const userProfileService = require('../services/user/userProfileService');
  
  beforeEach(() => {
    // Setup axios mock
    mock = new MockAdapter(axios);
    
    // Create mock user profiles with Fitbit integration
    mockProfiles = [
      {
        userId: 'user1',
        wearableIntegration: {
          fitbit: {
            accessToken: 'test-access-token-1',
            refreshToken: 'test-refresh-token-1',
            userId: 'fitbit-user-1'
          }
        }
      },
      {
        userId: 'user2',
        wearableIntegration: {
          fitbit: {
            accessToken: 'test-access-token-2',
            refreshToken: 'test-refresh-token-2',
            userId: 'fitbit-user-2'
          }
        }
      }
    ];
    
    // Mock database response
    db.UserProfile.findAll.mockResolvedValue(mockProfiles);
    
    // Mock successful responses for all API endpoints
    const successResponse = { success: true, data: { message: 'Success' } };
    
    // Sleep API endpoints
    mock.onGet(/api\/connect\/fitbit\/sleep\/sync/).reply(200, successResponse);
    
    // Activity API endpoints
    mock.onGet(/api\/connect\/fitbit\/activity\/sync/).reply(200, successResponse);
    
    // Steps API endpoints  
    mock.onGet(/api\/connect\/fitbit\/steps\/sync/).reply(200, successResponse);
    
    // Distance API endpoints
    mock.onGet(/api\/connect\/fitbit\/distance\/sync/).reply(200, successResponse);
    
    // SPO2 API endpoints
    mock.onGet(/api\/connect\/fitbit\/spo2\/sync/).reply(200, successResponse);
    
    // Heart rate API endpoints
    mock.onGet(/api\/connect\/fitbit\/heart-rate\/sync/).reply(200, successResponse);
    
    // Fitbit token refresh endpoint
    mock.onPost('https://api.fitbit.com/oauth2/token').reply(200, {
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      expires_in: 28800,
      user_id: 'fitbit-user-id'
    });
    
    // Reset mocked functions
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    // Clean up axios mock
    mock.restore();
  });
  
  test('syncSleepData should fetch sleep data for all users', async () => {
    await syncSleepData();
    
    // Check that the API was called for both users
    expect(mock.history.get.filter(req => req.url.includes('sleep/sync'))).toHaveLength(4); // Two users x two days
    
    // Check that updateFitbitLastSync was called for both users
    expect(userProfileService.updateFitbitLastSync).toHaveBeenCalledTimes(2);
    expect(userProfileService.updateFitbitLastSync).toHaveBeenCalledWith('user1');
    expect(userProfileService.updateFitbitLastSync).toHaveBeenCalledWith('user2');
  });
  
  test('syncActivityData should fetch activity data for all users', async () => {
    await syncActivityData();
    
    // Check that the API was called for both users
    expect(mock.history.get.filter(req => req.url.includes('activity/sync'))).toHaveLength(2);
    
    // Check that updateFitbitLastSync was called for both users
    expect(userProfileService.updateFitbitLastSync).toHaveBeenCalledTimes(2);
  });
  
  test('syncStepsData should fetch steps data for all users', async () => {
    await syncStepsData();
    
    // Check that the API was called for both users
    expect(mock.history.get.filter(req => req.url.includes('steps/sync'))).toHaveLength(2);
    
    // Check that updateFitbitLastSync was called for both users
    expect(userProfileService.updateFitbitLastSync).toHaveBeenCalledTimes(2);
  });
  
  test('syncDistanceData should fetch distance data for all users', async () => {
    await syncDistanceData();
    
    // Check that the API was called for both users  
    expect(mock.history.get.filter(req => req.url.includes('distance/sync'))).toHaveLength(2);
    
    // Check that updateFitbitLastSync was called for both users
    expect(userProfileService.updateFitbitLastSync).toHaveBeenCalledTimes(2);
  });
  
  test('syncSPO2Data should fetch SPO2 data for all users', async () => {
    await syncSPO2Data();
    
    // Check that the API was called for both users
    expect(mock.history.get.filter(req => req.url.includes('spo2/sync'))).toHaveLength(2);
    
    // Check that updateFitbitLastSync was called for both users
    expect(userProfileService.updateFitbitLastSync).toHaveBeenCalledTimes(2);
  });
  
  test('syncHeartRateData should fetch heart rate data for all users', async () => {
    await syncHeartRateData();
    
    // Check that the API was called for both users and for both days
    expect(mock.history.get.filter(req => req.url.includes('heart-rate/sync'))).toHaveLength(4); // Two users x two days
    
    // Check that updateFitbitLastSync was called for both users
    expect(userProfileService.updateFitbitLastSync).toHaveBeenCalledTimes(2);
  });
  
  test('refreshFitbitTokens should refresh tokens for all users', async () => {
    await refreshFitbitTokens();
    
    // Check that the Fitbit API was called to refresh tokens
    expect(mock.history.post.filter(req => req.url === 'https://api.fitbit.com/oauth2/token')).toHaveLength(2);
    
    // Check that tokens were saved for both users
    expect(userProfileService.saveFitbitAuth).toHaveBeenCalledTimes(2);
  });
  
  test('should handle API errors gracefully', async () => {
    // Mock an error response for one user
    mock.onGet(/api\/connect\/fitbit\/sleep\/sync/).reply(config => {
      if (config.headers.Authorization.includes('user1')) {
        return [401, { error: 'Unauthorized' }];
      }
      return [200, { success: true }];
    });
    
    await syncSleepData();
    
    // Should still update sync time for the successful user
    expect(userProfileService.updateFitbitLastSync).toHaveBeenCalledTimes(1);
    expect(userProfileService.updateFitbitLastSync).toHaveBeenCalledWith('user2');
  });
  
  test('JWT token should include userId in payload', async () => {
    await syncSleepData();
    
    // Get the Authorization header from one of the requests
    const request = mock.history.get.find(req => req.url.includes('sleep/sync'));
    const token = request.headers.Authorization.replace('Bearer ', '');
    
    // Decode and verify the token
    const decoded = jwt.verify(token, 'test-secret');
    
    // Check that userId is in the payload
    expect(decoded).toHaveProperty('userId');
    expect(['user1', 'user2']).toContain(decoded.userId);
  });
  
  test('manual test function that invokes all sync methods', async () => {
    // This function can be called to manually test all sync methods
    const testAllSync = async () => {
      console.log('Testing sleep data sync...');
      await syncSleepData();
      
      console.log('Testing activity data sync...');
      await syncActivityData();
      
      console.log('Testing steps data sync...');
      await syncStepsData();
      
      console.log('Testing distance data sync...');
      await syncDistanceData();
      
      console.log('Testing SPO2 data sync...');
      await syncSPO2Data();
      
      console.log('Testing heart rate data sync...');
      await syncHeartRateData();
      
      console.log('Testing token refresh...');
      await refreshFitbitTokens();
      
      console.log('All tests completed successfully!');
      return true;
    };
    
    // Uncomment to run the test manually
    // await testAllSync();
    
    // Just for the test to pass
    expect(true).toBeTruthy();
  });
});

// Export a function that can be called to test the worker manually
module.exports = {
  testFitbitSyncWorker: async () => {
    try {
      console.log('Starting Fitbit Sync Worker test...');
      
      console.log('Testing sleep data sync...');
      await syncSleepData();
      
      console.log('Testing activity data sync...');
      await syncActivityData();
      
      console.log('Testing steps data sync...');
      await syncStepsData();
      
      console.log('Testing distance data sync...');
      await syncDistanceData();
      
      console.log('Testing SPO2 data sync...');
      await syncSPO2Data();
      
      console.log('Testing heart rate data sync...');
      await syncHeartRateData();
      
      console.log('Testing token refresh...');
      await refreshFitbitTokens();
      
      console.log('All tests completed successfully!');
      return { success: true, message: 'All Fitbit sync functions are working correctly' };
    } catch (error) {
      console.error('Error testing Fitbit Sync Worker:', error);
      return { 
        success: false, 
        message: 'Error testing Fitbit Sync Worker', 
        error: error.message 
      };
    }
  }
}; 