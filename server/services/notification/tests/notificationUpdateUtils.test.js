const { jest } = require('@jest/globals');
const { 
  cancelMedicationReminders,
  cancelMealReminders,
  updateMedicationNotifications,
  updateMealNotifications
} = require('../utils/notificationUpdateUtils');

// Mock dependencies
jest.mock('@dtwin/config', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  errorLog: jest.fn()
}));

jest.mock('@dtwin/config/config/cache', () => ({
  redisClient: {
    del: jest.fn().mockResolvedValue(1)
  }
}));

jest.mock('../utils/timeUtils', () => ({
  calculateTimeToNextMedication: jest.fn().mockReturnValue(60 * 60 * 1000), // 1 hour
  calculateTimeToNextMeal: jest.fn().mockReturnValue(30 * 60 * 1000) // 30 minutes
}));

describe('Notification Update Utilities', () => {
  let mockQueue;
  let mockQueues;
  let mockJobs;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock jobs
    mockJobs = [
      {
        id: 'job1',
        data: {
          userId: 'user1',
          medicationName: 'Aspirin',
          scheduledTime: '08:00'
        },
        remove: jest.fn().mockResolvedValue(true)
      },
      {
        id: 'job2',
        data: {
          userId: 'user1',
          medicationName: 'Vitamin D',
          scheduledTime: '09:00'
        },
        remove: jest.fn().mockResolvedValue(true)
      },
      {
        id: 'job3',
        data: {
          userId: 'user2',
          medicationName: 'Aspirin',
          scheduledTime: '10:00'
        },
        remove: jest.fn().mockResolvedValue(true)
      }
    ];
    
    // Create mock queue
    mockQueue = {
      getJobs: jest.fn().mockResolvedValue(mockJobs),
      add: jest.fn().mockImplementation((name, data, options) => {
        return Promise.resolve({
          id: `new-job-${Date.now()}`,
          data,
          opts: options
        });
      })
    };
    
    // Create mock queues object with medication and meal queues
    mockQueues = {
      'medication-reminder': mockQueue,
      'meal-reminder': mockQueue
    };
  });
  
  describe('cancelMedicationReminders', () => {
    it('should cancel medication reminders for a specific user and medication', async () => {
      const result = await cancelMedicationReminders(mockQueue, 'user1', 'Aspirin');
      
      // Should cancel only job1
      expect(result).toBe(1);
      expect(mockQueue.getJobs).toHaveBeenCalledWith(['waiting', 'delayed']);
      expect(mockJobs[0].remove).toHaveBeenCalled();
      expect(mockJobs[1].remove).not.toHaveBeenCalled(); // Different medication
      expect(mockJobs[2].remove).not.toHaveBeenCalled(); // Different user
    });
    
    it('should handle errors gracefully', async () => {
      // Make getJobs throw an error
      mockQueue.getJobs.mockRejectedValueOnce(new Error('Test error'));
      
      const result = await cancelMedicationReminders(mockQueue, 'user1', 'Aspirin');
      
      expect(result).toBe(0);
    });
  });
  
  describe('updateMedicationNotifications', () => {
    it('should cancel old notifications and schedule new ones', async () => {
      const newTimings = ['09:30', '21:00'];
      const dose = '500mg';
      
      const result = await updateMedicationNotifications(
        mockQueues, 
        'user1', 
        'Aspirin',
        'med-123',
        newTimings,
        dose
      );
      
      // Should have canceled 1 old notification
      expect(result.canceled).toBe(1);
      
      // Should have scheduled 2 new notifications
      expect(result.scheduled).toBe(2);
      expect(mockQueue.add).toHaveBeenCalledTimes(2);
      
      // Verify the scheduled notifications have correct data
      expect(mockQueue.add.mock.calls[0][1]).toMatchObject({
        userId: 'user1',
        medicationName: 'Aspirin',
        medicationId: 'med-123',
        dose: '500mg',
        scheduledTime: '09:30'
      });
      
      expect(mockQueue.add.mock.calls[1][1]).toMatchObject({
        userId: 'user1',
        medicationName: 'Aspirin',
        medicationId: 'med-123',
        dose: '500mg',
        scheduledTime: '21:00'
      });
    });
    
    it('should throw error when queues are not available', async () => {
      await expect(updateMedicationNotifications(null, 'user1', 'Aspirin', 'med-123', ['09:00']))
        .rejects.toThrow('Medication reminder queue is not available');
    });
  });
  
  describe('updateMealNotifications', () => {
    it('should cancel old meal notifications and schedule new ones', async () => {
      // Setup mock jobs for meal notifications
      mockQueue.getJobs.mockResolvedValueOnce([
        {
          id: 'meal-job1',
          data: {
            userId: 'user1',
            mealType: 'breakfast',
            scheduledTime: '08:00'
          },
          remove: jest.fn().mockResolvedValue(true)
        },
        {
          id: 'meal-job2',
          data: {
            userId: 'user1',
            mealType: 'lunch',
            scheduledTime: '13:00'
          },
          remove: jest.fn().mockResolvedValue(true)
        }
      ]);
      
      const newMealTimings = {
        breakfast: '08:30',
        lunch: '13:30',
        dinner: '19:30'
      };
      
      const result = await updateMealNotifications(
        mockQueues, 
        'user1', 
        newMealTimings
      );
      
      // Should have canceled 2 old notifications
      expect(result.canceled).toBe(2);
      
      // Should have scheduled 3 new notifications
      expect(result.scheduled).toBe(3);
      expect(mockQueue.add).toHaveBeenCalledTimes(3);
      
      // Verify the scheduled notifications have correct data
      expect(mockQueue.add.mock.calls[0][1]).toMatchObject({
        userId: 'user1',
        mealType: 'breakfast',
        scheduledTime: '08:30'
      });
      
      expect(mockQueue.add.mock.calls[1][1]).toMatchObject({
        userId: 'user1',
        mealType: 'lunch',
        scheduledTime: '13:30'
      });
      
      expect(mockQueue.add.mock.calls[2][1]).toMatchObject({
        userId: 'user1',
        mealType: 'dinner',
        scheduledTime: '19:30'
      });
    });
  });
}); 