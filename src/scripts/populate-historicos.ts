import dotenv from 'dotenv';

dotenv.config();

import priceService from '../services/price.service';
import logger from '../utils/logger';
import connectDB from '../utils/db';

async function populateHistoricos() {
  try {
    await connectDB();
    logger.info('Connected to MongoDB');

    // Años a procesar de forma secuencial
    const startYear = 2019;
    const endYear = new Date().getFullYear();

    logger.info(`Starting historical price data population from ${startYear} to ${endYear}...`);

    let totalRecords = 0;
    let totalSaved = 0;
    let totalErrors = 0;

    // Procesar un año a la vez
    for (let year = startYear; year <= endYear; year++) {
      logger.info(`=== Processing year ${year} ===`);

      try {
        // Llamar al método del service para cada año individualmente
        const summary = await priceService.updatePrices(year);

        // Acumular estadísticas
        totalRecords += summary.totalRecords;
        totalSaved += summary.savedRecords;
        totalErrors += summary.errorRecords;

        logger.info(`Year ${year} completed successfully`);
      } catch (error) {
        logger.error(`Error processing year ${year}:`, error);
        // Continuar con el siguiente año aunque haya error
      }
    }

    // Show final summary
    logger.info('=== OVERALL PROCESSING SUMMARY ===');
    logger.info(`Years processed: ${endYear - startYear + 1}`);
    logger.info(`Total parsed records: ${totalRecords}`);
    logger.info(`Successfully saved records: ${totalSaved}`);
    logger.info(`Records with errors: ${totalErrors}`);
    logger.info('================================');

    logger.info('Historical data population completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error in population process:', error);
    process.exit(1);
  }
}

populateHistoricos();
