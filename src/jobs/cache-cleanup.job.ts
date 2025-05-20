import S3Service from '../services/s3.service';
import logger from '../utils/logger';

/**
 * Job para limpiar las URLs firmadas expiradas de la caché de S3
 * Se ejecuta periódicamente para evitar que la caché crezca indefinidamente
 */
export async function cleanSignedUrlCacheJob() {
  try {
    logger.info('Iniciando limpieza de caché de URLs firmadas de S3');

    // Llamar al método de limpieza de la caché en el servicio S3
    S3Service.cleanExpiredCache();

    // Obtener estadísticas de la caché (como el tamaño actual)
    const cacheSize = S3Service.getCacheSize();

    logger.info(
      `Limpieza de caché de URLs firmadas completada. Tamaño actual: ${cacheSize} elementos.`,
    );
  } catch (error) {
    logger.error('Error en la limpieza de caché de URLs firmadas:', error);
    throw error;
  }
}
