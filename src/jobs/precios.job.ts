import priceService from '../services/price.service';
import logger from '../utils/logger';

export async function updatePricesJob() {
  try {
    logger.info('Starting price update job');
    const currentYear = new Date().getFullYear();
    const summary = await priceService.updatePrices(currentYear);

    logger.info(
      `Price update job completed successfully. Saved ${summary.savedRecords} of ${summary.totalRecords} records.`,
    );
    return summary;
  } catch (error) {
    logger.error('Error in price update job:', error);
    throw error;
  }
}
