import { Request, Response } from 'express';
import logger from '../utils/logger';
import alertService from '../services/alert.service';

/**
 * Gets the latest weather alerts from cache or directly from AEMET if cache is invalid
 * @param req Request object
 * @param res Response object
 */
export const getWeatherAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await alertService.getWeatherAlerts();
    res.status(200).json(data);
  } catch (err: any) {
    res.status(500).json({ message: 'Error retrieving weather alerts', error: err.message });
    logger.error('Error retrieving weather alerts', err);
  }
};

/**
 * Gets information about the alerts cache status
 * Only accessible by admins
 * @param req Request object
 * @param res Response object
 */
export const getAlertsCacheStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = alertService.getCacheStatus();
    res.status(200).json(status);
  } catch (err: any) {
    res.status(500).json({ message: 'Error retrieving cache status', error: err.message });
    logger.error('Error retrieving cache status', err);
  }
};

/**
 * Forces a refresh of the alerts cache
 * Only accessible by admins
 * @param req Request object
 * @param res Response object
 */
export const refreshAlertsCache = async (req: Request, res: Response): Promise<void> => {
  try {
    await alertService.refreshAlertsCache();
    res.status(200).json({
      message: 'Alerts cache refreshed successfully',
      status: alertService.getCacheStatus(),
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Error refreshing alerts cache', error: err.message });
    logger.error('Error refreshing alerts cache', err);
  }
};
