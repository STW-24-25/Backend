import priceService from '../services/price.service';
import dotenv from 'dotenv';
import logger from '../utils/logger';
import connectDB from '../utils/db';

dotenv.config();

async function populateHistoricos() {
  try {
    await connectDB();
    logger.info('Connected to MongoDB');

    const startYear = 2019;
    const currentYear = new Date().getFullYear();

    logger.info(`Starting historical price data population from ${startYear} to ${currentYear}...`);

    // Use the price service to import historical prices
    const summary = await priceService.importHistoricalPrices(startYear, currentYear);

    // Show final summary
    logger.info('=== PROCESSING SUMMARY ===');
    logger.info(`Total years processed: ${summary.yearsProcessed}`);
    logger.info(`Total parsed records: ${summary.totalRecords}`);
    logger.info(`Successfully saved records: ${summary.savedRecords}`);
    logger.info(`Duplicate records skipped: ${summary.skippedRecords}`);
    logger.info(`Records with errors: ${summary.errorRecords}`);
    logger.info('================================');

    logger.info('Historical data population completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error in population process:', error);
    process.exit(1);
  }
}

populateHistoricos();
