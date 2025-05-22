import alertService from '../services/alert.service';
import logger from '../utils/logger';

/**
 * Job to refresh the weather alerts cache periodically
 * This will be scheduled to run hourly
 */
export async function refreshWeatherAlertsJob() {
  try {
    logger.info('Starting scheduled weather alerts cache refresh job');

    // Get cache status before refresh
    const beforeStatus = alertService.getCacheStatus();

    // Refresh the cache
    await alertService.refreshAlertsCache();

    // Get cache status after refresh for logging
    const afterStatus = alertService.getCacheStatus();

    logger.info(
      `Weather alerts cache refreshed successfully. Previous age: ${
        beforeStatus.age ? Math.floor(beforeStatus.age / 1000 / 60) + ' minutes' : 'N/A'
      }, Updated at: ${afterStatus.lastUpdated}`,
    );

    return true;
  } catch (error) {
    logger.error('Error in weather alerts cache refresh job:', error);
    return false;
  }
}
