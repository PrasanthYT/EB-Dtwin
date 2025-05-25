const { describe, test, expect, beforeEach, afterEach, jest: jestObj } = require('@jest/globals');
const { sendSocketNotification, isUserConnected } = require('../services/socketService');
const { sendPushNotification, initFirebase, getUserFcmTokens } = require('../services/pushService');
jest.mock('@dtwin/config/config/logging', () => ({
  info: jest.fn(),
  errorLog: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  logger: { info: jest.fn() }
}));
jest.mock('@dtwin/shared-database', () => ({
  UserProfile: {
    findByPk: jest.fn()
  }
}));
jest.mock('firebase-admin', () => {
  const messagingMock = {
    send: jest.fn().mockResolvedValue('message-id-123'),
    sendMulticast: jest.fn().mockResolvedValue({ 
      successCount: 1, 
      failureCount: 0,
      responses: [{ success: true }] 
    })
  };
  return {
    apps: [],
    initializeApp: jest.fn(),
    credential: {
      cert: jest.fn().mockReturnValue({})
    },
    messaging: jest.fn().mockReturnValue(messagingMock)
  };
});
const mockSocket = {
  id: 'socket-id-123',
  join: jest.fn(),
  on: jest.fn(),
  emit: jest.fn()
};
const mockIo = {
  on: jest.fn(),
  to: jest.fn().mockReturnValue({
    emit: jest.fn()
  })
};
describe('Socket Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('Should check if user is connected', () => {
    const isConnectedOriginal = isUserConnected;
    global.isUserConnected = jest.fn().mockImplementation((userId) => {
      return userId === 'connected-user-id';
    });
    expect(isUserConnected('connected-user-id')).toBe(true);
    expect(isUserConnected('disconnected-user-id')).toBe(false);
    global.isUserConnected = isConnectedOriginal;
  });
  test('Should send socket notification to connected user', async () => {
    const isUserConnectedMock = jest.spyOn(global, 'isUserConnected');
    isUserConnectedMock.mockImplementation(() => true);
    const notification = {
      title: 'Test Notification',
      message: 'This is a test',
      type: 'test'
    };
    const result = await sendSocketNotification(mockIo, 'user-123', notification);
    expect(result).toBe(true);
    expect(mockIo.to).toHaveBeenCalledWith('user:user-123');
    expect(mockIo.to().emit).toHaveBeenCalledWith('notification', expect.objectContaining({
      title: 'Test Notification',
      message: 'This is a test',
      type: 'test',
      timestamp: expect.any(String)
    }));
    isUserConnectedMock.mockRestore();
  });
  test('Should not send socket notification to disconnected user', async () => {
    const isUserConnectedMock = jest.spyOn(global, 'isUserConnected');
    isUserConnectedMock.mockImplementation(() => false);
    const notification = {
      title: 'Test Notification',
      message: 'This is a test',
      type: 'test'
    };
    const result = await sendSocketNotification(mockIo, 'user-123', notification);
    expect(result).toBe(false);
    expect(mockIo.to).not.toHaveBeenCalled();
    isUserConnectedMock.mockRestore();
  });
});
describe('Push Notification Service', () => {
  const { UserProfile } = require('@dtwin/shared-database');
  const admin = require('firebase-admin');
  beforeEach(() => {
    jest.clearAllMocks();
    UserProfile.findByPk.mockResolvedValue({
      fcmTokens: ['token-1', 'token-2']
    });
  });
  test('Should initialize Firebase successfully', () => {
    const result = initFirebase();
    expect(result).toBe(true);
    expect(admin.initializeApp).toHaveBeenCalled();
  });
  test('Should get user FCM tokens', async () => {
    const tokens = await getUserFcmTokens('user-123');
    expect(tokens).toEqual(['token-1', 'token-2']);
    expect(UserProfile.findByPk).toHaveBeenCalledWith('user-123');
  });
  test('Should send push notification to single device', async () => {
    UserProfile.findByPk.mockResolvedValue({
      fcmTokens: ['token-1']
    });
    const notification = {
      title: 'Test Notification',
      message: 'This is a test',
      type: 'test'
    };
    const result = await sendPushNotification('user-123', notification);
    expect(result.success).toBe(true);
    expect(admin.messaging().send).toHaveBeenCalledWith(expect.objectContaining({
      token: 'token-1',
      notification: {
        title: 'Test Notification',
        body: 'This is a test'
      }
    }));
  });
  test('Should send push notification to multiple devices', async () => {
    const notification = {
      title: 'Test Notification',
      message: 'This is a test',
      type: 'test'
    };
    const result = await sendPushNotification('user-123', notification);
    expect(result.success).toBe(true);
    expect(result.successCount).toBe(1);
    expect(admin.messaging().sendMulticast).toHaveBeenCalledWith(expect.objectContaining({
      tokens: ['token-1', 'token-2'],
      notification: {
        title: 'Test Notification',
        body: 'This is a test'
      }
    }));
  });
  test('Should handle user with no FCM tokens', async () => {
    UserProfile.findByPk.mockResolvedValue({
      fcmTokens: []
    });
    const notification = {
      title: 'Test Notification',
      message: 'This is a test',
      type: 'test'
    };
    const result = await sendPushNotification('user-123', notification);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('no-tokens');
    expect(admin.messaging().send).not.toHaveBeenCalled();
    expect(admin.messaging().sendMulticast).not.toHaveBeenCalled();
  });
  test('Should handle Firebase initialization failure', async () => {
    admin.initializeApp.mockImplementationOnce(() => {
      throw new Error('Firebase initialization failed');
    });
    const notification = {
      title: 'Test Notification',
      message: 'This is a test',
      type: 'test'
    };
    const result = await sendPushNotification('user-123', notification);
    expect(result.success).toBe(false);
    expect(result.error).toBe('firebase-init-failed');
  });
}); 