// Mock 'aemet-api' and 'logger' at the very top
const mockAemetClientInstance = {
  getAlertsGeoJSON: jest.fn(),
};
jest.mock('aemet-api', () => ({
  Aemet: jest.fn().mockImplementation(() => mockAemetClientInstance),
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Import the service and other necessary modules AFTER mocks are defined
import alertService from '../services/alert.service';
import { Aemet } from 'aemet-api'; // For type checking the Aemet mock

describe('AlertService', () => {
  const mockAlertData = {
    type: 'FeatureCollection',
    features: [{ id: 'alert1', data: 'some_data' }],
  };
  const mockError = new Error('AEMET API Error');
  const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour, as defined in AlertService

  // Store original Date.now to restore it
  const originalDateNow = Date.now;

  beforeEach(() => {
    // Clear mock call counts and implementations before each test
    mockAemetClientInstance.getAlertsGeoJSON.mockClear();

    // Reset the internal cache state of the singleton AlertService instance
    (alertService as any).alertsCache = null;

    // Restore Date.now to original and use real timers by default
    global.Date.now = originalDateNow;
    jest.useRealTimers();
  });

  afterAll(() => {
    // Restore Date.now globally after all tests are done
    global.Date.now = originalDateNow;
    jest.useRealTimers();
  });

  describe('Initialization (Constructor)', () => {
    it('should have initialized Aemet client with API key and logged info on module load', () => {
      // These checks verify that the constructor logic ran when the module was imported.
      // The Aemet mock constructor should have been called once.
      expect(Aemet).toHaveBeenCalledTimes(1);
      // process.env.AEMET_API_KEY should be set in your test environment or Jest setup
      expect(Aemet).toHaveBeenCalledWith(process.env.AEMET_API_KEY);
    });
  });

  describe('refreshAlertsCache', () => {
    it('should fetch data from AEMET, update cache, log, and return data on success', async () => {
      mockAemetClientInstance.getAlertsGeoJSON.mockResolvedValue(mockAlertData);
      const currentTime = 1678886400000; // Example: March 15, 2023 12:00:00 PM UTC
      global.Date.now = jest.fn(() => currentTime);

      const result = await alertService.refreshAlertsCache();

      expect(mockAemetClientInstance.getAlertsGeoJSON).toHaveBeenCalledTimes(1);
      expect((alertService as any).alertsCache).toEqual({
        data: mockAlertData,
        timestamp: currentTime,
      });
      expect(result).toEqual(mockAlertData);
    });

    it('should log an error and re-throw if AEMET API fails', async () => {
      mockAemetClientInstance.getAlertsGeoJSON.mockRejectedValue(mockError);

      await expect(alertService.refreshAlertsCache()).rejects.toThrow(mockError);

      expect((alertService as any).alertsCache).toBeNull(); // Cache should not be set
    });
  });

  describe('getWeatherAlerts', () => {
    it('should return data from valid cache and log debug', async () => {
      const currentTime = originalDateNow();
      (alertService as any).alertsCache = { data: mockAlertData, timestamp: currentTime };
      jest.spyOn(alertService as any, 'refreshAlertsCache'); // Spy, not mock

      const result = await alertService.getWeatherAlerts();

      expect(result).toEqual(mockAlertData);
      expect((alertService as any).refreshAlertsCache).not.toHaveBeenCalled();
    });

    it('should refresh cache if cache is empty and return new data', async () => {
      mockAemetClientInstance.getAlertsGeoJSON.mockResolvedValue(mockAlertData);
      const currentTime = originalDateNow();
      global.Date.now = jest.fn(() => currentTime);

      const result = await alertService.getWeatherAlerts();

      expect(result).toEqual(mockAlertData);
      expect(mockAemetClientInstance.getAlertsGeoJSON).toHaveBeenCalledTimes(1); // refresh called
      expect((alertService as any).alertsCache.timestamp).toBe(currentTime);
    });

    it('should refresh cache if cache is expired and return new data', async () => {
      const expiredTime = originalDateNow() - CACHE_TTL_MS - 1000; // Expired
      (alertService as any).alertsCache = { data: { old: 'data' }, timestamp: expiredTime };
      mockAemetClientInstance.getAlertsGeoJSON.mockResolvedValue(mockAlertData); // New data from refresh
      const currentTime = originalDateNow();
      global.Date.now = jest.fn(() => currentTime);

      const result = await alertService.getWeatherAlerts();

      expect(result).toEqual(mockAlertData); // Should be new data
      expect(mockAemetClientInstance.getAlertsGeoJSON).toHaveBeenCalledTimes(1);
      expect((alertService as any).alertsCache.timestamp).toBe(currentTime);
    });

    it('should return expired cache data if API refresh fails but cache exists', async () => {
      const expiredTime = originalDateNow() - CACHE_TTL_MS - 1000;
      const oldCachedData = { old: 'data', source: 'expired_cache' };
      (alertService as any).alertsCache = { data: oldCachedData, timestamp: expiredTime };
      mockAemetClientInstance.getAlertsGeoJSON.mockRejectedValue(mockError); // API fails

      const result = await alertService.getWeatherAlerts();

      expect(result).toEqual(oldCachedData);
    });

    it('should throw error if API refresh fails and no cache exists', async () => {
      (alertService as any).alertsCache = null; // No cache
      mockAemetClientInstance.getAlertsGeoJSON.mockRejectedValue(mockError); // API fails

      await expect(alertService.getWeatherAlerts()).rejects.toThrow(mockError);
    });
  });

  describe('getCacheStatus', () => {
    it('should return status for non-existent cache', () => {
      (alertService as any).alertsCache = null;
      const status = alertService.getCacheStatus();
      expect(status).toEqual({
        exists: false,
        age: null,
        isValid: false,
        lastUpdated: null,
      });
    });

    it('should return status for existing valid cache', () => {
      const MOCKED_CURRENT_TIME = originalDateNow(); // 1. Capture a fixed "current time"

      // Cache was created 10000 ms *before* MOCKED_CURRENT_TIME
      const cacheTime = MOCKED_CURRENT_TIME - 10000;

      (alertService as any).alertsCache = { data: mockAlertData, timestamp: cacheTime };

      // 2. Ensure Date.now() inside the service returns our fixed "current time"
      global.Date.now = jest.fn(() => MOCKED_CURRENT_TIME);

      const status = alertService.getCacheStatus();

      expect(status.exists).toBe(true);

      // 3. Calculate expected age based on the fixed time
      const expectedAge = MOCKED_CURRENT_TIME - cacheTime; // This will be exactly 10000
      expect(status.age).toBe(expectedAge);

      expect(status.isValid).toBe(true);
      expect(status.lastUpdated).toEqual(new Date(cacheTime));
    });

    it('should return status for existing expired cache', () => {
      const MOCKED_CURRENT_TIME = originalDateNow(); // 1. Capture a fixed "current time"

      // Cache was created CACHE_TTL_MS + 10000 ms *before* MOCKED_CURRENT_TIME
      const cacheTime = MOCKED_CURRENT_TIME - CACHE_TTL_MS - 10000;

      (alertService as any).alertsCache = { data: mockAlertData, timestamp: cacheTime };

      // 2. Ensure Date.now() inside the service returns our fixed "current time"
      global.Date.now = jest.fn(() => MOCKED_CURRENT_TIME);

      const status = alertService.getCacheStatus();

      expect(status.exists).toBe(true);

      // 3. Calculate expected age based on the fixed time
      const expectedAge = MOCKED_CURRENT_TIME - cacheTime; // This will be exactly CACHE_TTL_MS + 10000
      expect(status.age).toBe(expectedAge); // This should now consistently be 3610000

      expect(status.isValid).toBe(false);
      expect(status.lastUpdated).toEqual(new Date(cacheTime));
    });
  });
});
