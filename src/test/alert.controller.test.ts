import { Request, Response } from 'express';

jest.mock('../services/alert.service');
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('aemet-api', () => ({
  Aemet: jest.fn().mockImplementation(() => ({
    getAlertsGeoJSON: jest.fn().mockResolvedValue({ type: 'FeatureCollection', features: [] }),
  })),
}));

import * as alertController from '../controllers/alert.controller';
import alertService from '../services/alert.service';
import logger from '../utils/logger';

// Helper to create mock Request and Response objects
const mockRequest = (data: Partial<Request> = {}): Request => {
  const req = {} as Partial<Request>;
  req.body = data.body || {};
  req.params = data.params || {};
  req.query = data.query || {};
  return req as Request;
};

const mockResponse = (): Response => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

describe('Alert Controller', () => {
  let req: Request;
  let res: Response;

  beforeEach(() => {
    jest.clearAllMocks(); // Clear all mocks before each test
    req = mockRequest();
    res = mockResponse();
  });

  describe('getWeatherAlerts', () => {
    it('should return weather alerts and 200 status on success', async () => {
      const mockAlertData = { type: 'FeatureCollection', features: [] };
      (alertService.getWeatherAlerts as jest.Mock).mockResolvedValue(mockAlertData);

      await alertController.getWeatherAlerts(req, res);

      expect(alertService.getWeatherAlerts).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockAlertData);
    });

    it('should return 500 status and error message on service failure', async () => {
      const errorMessage = 'Failed to fetch alerts';
      (alertService.getWeatherAlerts as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await alertController.getWeatherAlerts(req, res);

      expect(alertService.getWeatherAlerts).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error retrieving weather alerts',
        error: errorMessage,
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Error retrieving weather alerts',
        expect.any(Error),
      );
    });
  });

  describe('getAlertsCacheStatus', () => {
    it('should return cache status and 200 status on success', async () => {
      const mockCacheStatus = {
        exists: true,
        age: 1000,
        isValid: true,
        lastUpdated: new Date(),
      };
      (alertService.getCacheStatus as jest.Mock).mockReturnValue(mockCacheStatus);

      await alertController.getAlertsCacheStatus(req, res);

      expect(alertService.getCacheStatus).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockCacheStatus);
    });

    it('should return 500 status and error message if getCacheStatus throws (simulated)', async () => {
      const errorMessage = 'Failed to get cache status';
      // Simulate an error being thrown by getCacheStatus, even though it's synchronous in the actual code
      (alertService.getCacheStatus as jest.Mock).mockImplementation(() => {
        throw new Error(errorMessage);
      });

      await alertController.getAlertsCacheStatus(req, res);

      expect(alertService.getCacheStatus).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error retrieving cache status',
        error: errorMessage,
      });
      expect(logger.error).toHaveBeenCalledWith('Error retrieving cache status', expect.any(Error));
    });
  });

  describe('refreshAlertsCache', () => {
    it('should refresh cache, return success message, new status, and 200 status on success', async () => {
      const mockRefreshedCacheStatus = {
        exists: true,
        age: 50, // Small age after refresh
        isValid: true,
        lastUpdated: new Date(),
      };
      (alertService.refreshAlertsCache as jest.Mock).mockResolvedValue(undefined); // refreshAlertsCache might not return data directly
      (alertService.getCacheStatus as jest.Mock).mockReturnValue(mockRefreshedCacheStatus);

      await alertController.refreshAlertsCache(req, res);

      expect(alertService.refreshAlertsCache).toHaveBeenCalledTimes(1);
      expect(alertService.getCacheStatus).toHaveBeenCalledTimes(1); // Called after refresh
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Alerts cache refreshed successfully',
        status: mockRefreshedCacheStatus,
      });
    });

    it('should return 500 status and error message on service failure during refresh', async () => {
      const errorMessage = 'Failed to refresh cache';
      (alertService.refreshAlertsCache as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await alertController.refreshAlertsCache(req, res);

      expect(alertService.refreshAlertsCache).toHaveBeenCalledTimes(1);
      expect(alertService.getCacheStatus).not.toHaveBeenCalled(); // Should not be called if refresh fails
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error refreshing alerts cache',
        error: errorMessage,
      });
      expect(logger.error).toHaveBeenCalledWith('Error refreshing alerts cache', expect.any(Error));
    });
  });
});
