import { Aemet } from 'aemet-api';
import logger from '../utils/logger';

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

/**
 * Service for managing weather alerts from AEMET
 */
class AlertService {
  private static readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour in milliseconds
  private alertsCache: CacheItem<any> | null = null;
  private aemetClient: Aemet;

  constructor() {
    this.aemetClient = new Aemet(process.env.AEMET_API_KEY as string);
    logger.info('AlertService initialized with AEMET client');
  }

  /**
   * Retrieves weather alerts from cache or from AEMET API if cache is invalid
   * @returns GeoJSON data of weather alerts
   */
  async getWeatherAlerts(): Promise<any> {
    try {
      // Return cached data if valid
      if (this.isCacheValid()) {
        logger.debug('Using cached weather alerts data');
        return this.alertsCache!.data;
      }

      // Cache is invalid or empty, fetch fresh data
      return await this.refreshAlertsCache();
    } catch (error) {
      logger.error('Error retrieving weather alerts:', error);

      // If we have cached data, return it even if expired rather than failing
      if (this.alertsCache) {
        logger.warn('Returning expired cached alerts due to API error');
        return this.alertsCache.data;
      }

      throw error;
    }
  }

  /**
   * Forcefully refreshes the alerts cache regardless of its current validity
   * @returns The new cached data
   */
  async refreshAlertsCache(): Promise<any> {
    try {
      logger.info('Refreshing weather alerts cache from AEMET API');
      const data = await this.aemetClient.getAlertsGeoJSON();

      this.alertsCache = {
        data,
        timestamp: Date.now(),
      };

      logger.info('Weather alerts cache successfully refreshed');
      return data;
    } catch (error) {
      logger.error('Failed to refresh weather alerts cache:', error);
      throw error;
    }
  }

  /**
   * Checks if the current cache is valid (exists and not expired)
   * @returns boolean indicating if cache is valid
   */
  private isCacheValid(): boolean {
    if (!this.alertsCache) return false;

    const now = Date.now();
    const cacheAge = now - this.alertsCache.timestamp;
    return cacheAge < AlertService.CACHE_TTL_MS;
  }

  /**
   * Get current cache statistics for monitoring
   * @returns Object with cache information
   */
  getCacheStatus(): {
    exists: boolean;
    age: number | null;
    isValid: boolean;
    lastUpdated: Date | null;
  } {
    if (!this.alertsCache) {
      return { exists: false, age: null, isValid: false, lastUpdated: null };
    }

    const now = Date.now();
    const age = now - this.alertsCache.timestamp;

    return {
      exists: true,
      age,
      isValid: age < AlertService.CACHE_TTL_MS,
      lastUpdated: new Date(this.alertsCache.timestamp),
    };
  }
}

export default new AlertService();
