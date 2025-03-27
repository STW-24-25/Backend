import { updatePricesJob } from './precios.job';
import cron from 'node-cron';
import logger from '../utils/logger';

// Variable para almacenar la referencia a la tarea programada
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
    scheduled: false, // La tarea se crea pero no se activa automáticamente
  },
);

// Función para configurar todos los jobs
export function configurarJobs() {
  logger.info('Configurando jobs programados...');

  // Iniciar la tarea de actualización de precios
  pricesUpdateJob.start();

  logger.info('Jobs programados configurados correctamente');
}
