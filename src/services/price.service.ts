import { descargarPrecios, parsePrecios, convertirAEurosPorKg } from 'agro-precios';
import ProductModel from '../models/product.model';
import logger from '../utils/logger';
import { FiltroFecha } from 'agro-precios';
import dateService from './date.service';

class PriceService {
  /**
   * Downloads and parses price data for the specified year
   * @param year Year to download prices for
   * @returns Parsed data
   */
  async downloadAndParsePrices(year: number = new Date().getFullYear()) {
    try {
      logger.info(`Iniciando descarga de precios para el año ${year}...`);
      const path = await descargarPrecios(year);
      logger.info(`Descarga completada para el año ${year}, archivo guardado en: ${path}`);

      logger.info(`Iniciando análisis del archivo para el año ${year}...`);
      const data = parsePrecios(path);
      logger.info(
        `Análisis completado para el año ${year}, se obtuvieron ${data.length} registros`,
      );

      logger.info('=== ORIGINAL DATA FROM AGRO-PRECIOS ===');
      logger.info(JSON.stringify(data[0], null, 2)); // Show first record as example
      logger.info('=====================================');

      return data;
    } catch (error) {
      logger.error(`Error downloading and parsing prices for year ${year}:`, error);
      throw error;
    }
  }

  /**
   * Converts price data to euros per kg
   * @param data Price data to convert
   * @returns Data converted to euros per kg
   */
  convertDataToEurosPerKg(data: any[]) {
    try {
      const convertedPrices = convertirAEurosPorKg(data);

      logger.info('=== DATA CONVERTED TO EUROS/KG ===');
      logger.info(JSON.stringify(convertedPrices[0], null, 2)); // Show first converted record
      logger.info('=====================================');

      return convertedPrices;
    } catch (error) {
      logger.error('Error converting data to euros/kg:', error);
      throw error;
    }
  }

  /**
   * Cleans a product name by removing units and parentheses
   * @param name Product name to clean
   * @returns Cleaned product name
   */
  cleanProductName(name: string): string {
    let cleanName = name.replace(/\([^)]*\)/g, '').trim();
    cleanName = cleanName
      .replace(/(€\/100kg|€\/kg|€\/docena|€\/l|€\/100l|€\/100kg Vivo)/g, '')
      .trim();
    return cleanName;
  }

  /**
   * Processes and normalizes raw price data
   * @param priceData Raw price data
   * @param year Year of the data
   * @returns Normalized price data
   */
  normalizeProductPrices(priceData: any[], year: number) {
    const normalizedData = [];

    for (const item of priceData) {
      const productName = this.cleanProductName(item.nombre || item.producto);

      if (!productName) {
        logger.warn('Product name missing, skipping record');
        continue;
      }

      // Handle different data structures that might come from agro-precios
      if (item.prices || item.precios) {
        const pricesList = item.prices || item.precios;
        for (const priceItem of pricesList) {
          const dateValue = priceItem.date || priceItem.fecha;
          const weekValue = priceItem.week || priceItem.semana;
          const priceValue = priceItem.price || priceItem.precio || priceItem.valor;

          if (priceValue === null || priceValue === undefined) {
            continue;
          }

          // Siempre obtenemos una fecha válida gracias a las mejoras en dateService
          const cleanDateValue = dateService.cleanDate(dateValue, weekValue, year);

          normalizedData.push({
            name: productName,
            sector: item.sector,
            date: cleanDateValue,
            price: priceValue,
          });
        }
      } else if (item.precio !== undefined && item.fecha !== undefined) {
        // Simple structure with direct price and date
        const cleanDateValue = dateService.cleanDate(
          item.fecha,
          item.semana || `Semana ${Math.floor(Math.random() * 52) + 1}`,
          year,
        );

        normalizedData.push({
          name: productName,
          date: cleanDateValue,
          price: item.precio,
        });
      }
    }

    return normalizedData;
  }

  /**
   * Saves prices to the database
   * @param prices Array of prices to save
   * @returns Operation summary
   */
  async savePrices(prices: any[]) {
    // Counters for summary
    let totalRecords = 0;
    let savedRecords = 0;
    let errorRecords = 0;

    for (const price of prices) {
      totalRecords++;

      try {
        await ProductModel.findOneAndUpdate(
          { name: price.nombre || price.name },
          {
            $set: {
              sector: price.sector || 'No especificado',
            },
            $push: {
              prices: {
                date: new Date(price.fecha || price.date),
                price: price.precio || price.price,
              },
            },
          },
          { upsert: true, new: true },
        );
        savedRecords++;
      } catch (error) {
        errorRecords++;
        logger.error(`Error saving price for ${price.nombre || price.name}:`, error);
      }
    }

    // Operation summary
    const summary = {
      totalRecords,
      savedRecords,
      errorRecords,
    };

    return summary;
  }

  /**
   * Retrieves and updates prices for a specific year
   * @param year Year to update prices for, defaults to current year
   * @param filter Optional date filter
   * @returns Update summary
   */
  async updatePrices(year: number = new Date().getFullYear(), filter?: FiltroFecha) {
    try {
      const data = await this.downloadAndParsePrices(year);
      const convertedPrices = this.convertDataToEurosPerKg(data);

      // Apply date filter if provided
      let filteredPrices = this.normalizeProductPrices(convertedPrices, year);
      if (filter) {
        filteredPrices = convertedPrices.filter(price => {
          const priceDate = new Date(price.fecha);
          return (
            (!filter.dia || priceDate.getDate() === filter.dia) &&
            (!filter.mes || priceDate.getMonth() + 1 === filter.mes) &&
            (!filter.año || priceDate.getFullYear() === filter.año)
          );
        });
      }

      const summary = await this.savePrices(filteredPrices);

      // Show final summary
      logger.info('=== PRICE UPDATE SUMMARY ===');
      logger.info(`Total parsed records: ${summary.totalRecords}`);
      logger.info(`Successfully saved records: ${summary.savedRecords}`);
      logger.info(`Records with save errors: ${summary.errorRecords}`);
      logger.info('==========================================');

      return summary;
    } catch (error) {
      logger.error('Error updating prices:', error);
      throw error;
    }
  }

  /**
   * Processes and imports historical price data for a range of years
   * @param startYear Starting year (inclusive)
   * @param endYear Ending year (inclusive, defaults to current year)
   * @returns Processing summary
   */
  async importHistoricalPrices(
    startYear: number = 2019,
    endYear: number = new Date().getFullYear(),
  ) {
    const processedRecords = new Set<string>();
    let totalRecords = 0;
    let savedRecords = 0;
    let skippedRecords = 0;
    let errorRecords = 0;

    for (let year = startYear; year <= endYear; year++) {
      logger.info(`Processing data for year ${year}...`);

      try {
        const data = await this.downloadAndParsePrices(year);
        const convertedPrices = this.convertDataToEurosPerKg(data);
        const normalizedData = this.normalizeProductPrices(convertedPrices, year);

        for (const item of normalizedData) {
          totalRecords++;

          // Check for duplicates using a unique key
          const uniqueKey = `${item.name}-${item.date}-${item.price}`;
          if (processedRecords.has(uniqueKey)) {
            skippedRecords++;
            continue;
          }

          processedRecords.add(uniqueKey);

          try {
            await ProductModel.findOneAndUpdate(
              { name: item.name },
              {
                $set: {
                  sector: item.sector || 'No especificado',
                },
                $push: {
                  prices: {
                    date: item.date,
                    price: item.price,
                  },
                },
              },
              { upsert: true, new: true },
            );
            savedRecords++;
          } catch (error) {
            errorRecords++;
            logger.error(`Error saving historical price for ${item.name}:`, error);
          }
        }

        logger.info(
          `Year ${year} completed. Processed ${normalizedData.length} normalized records`,
        );
      } catch (error) {
        logger.error(`Error processing year ${year}:`, error);
      }
    }

    const summary = {
      totalRecords,
      savedRecords,
      skippedRecords,
      errorRecords,
      yearsProcessed: endYear - startYear + 1,
    };

    return summary;
  }
}

export default new PriceService();
