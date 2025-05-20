import { updatePricesJob } from './precios.job';
import { cleanSignedUrlCacheJob } from './cache-cleanup.job';
import { refreshWeatherAlertsJob } from './aemet.job';
import cron from 'node-cron';
import logger from '../utils/logger';

// Variable para almacenar la referencia a la tarea programada de precios
export const pricesUpdateJob = cron.schedule(
  '0 3 * * 1',
  async () => {
    logger.info('Running scheduled price update job');
    try {
      await updatePricesJob();
      logger.info('Scheduled price update job completed');
    } catch (error) {
      logger.error('Error in scheduled price update job:', error);
    }
  },
  {
    scheduled: false,
  },
);

// Variable para almacenar la referencia a la tarea de limpieza de caché
export const cacheCleanupJob = cron.schedule(
  '0 * * * *', // Ejecutar cada hora, al minuto 0
  async () => {
    logger.info('Running scheduled cache cleanup job');
    try {
      await cleanSignedUrlCacheJob();
      logger.info('Scheduled cache cleanup job completed');
    } catch (error) {
      logger.error('Error in scheduled cache cleanup job:', error);
    }
  },
  {
    scheduled: false,
  },
);

export const alertsCacheJob = cron.schedule(
  '15 * * * *', // Run 15 minutes after each hour to stagger API calls
  async () => {
    logger.info('Running scheduled weather alerts cache refresh job');
    try {
      await refreshWeatherAlertsJob();
      logger.info('Weather alerts cache refresh job completed');
    } catch (error) {
      logger.error('Error in scheduled weather alerts cache refresh job:', error);
    }
  },
  {
    scheduled: false,
  },
);

// Función para configurar todos los jobs
export function configurarJobs() {
  logger.info('Configuring scheduled jobs...');

  // Iniciar la tarea de actualización de precios
  pricesUpdateJob.start();

  // Iniciar la tarea de limpieza de caché
  cacheCleanupJob.start();

  alertsCacheJob.start();

  logger.info('Jobs scheduled succesfully');
}
