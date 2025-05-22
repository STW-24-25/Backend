import dotenv from 'dotenv';

dotenv.config();

import logger from '../utils/logger';
import connectDB from '../utils/db';
import ProductModel from '../models/product.model';

async function clearProducts() {
  try {
    await connectDB();
    logger.info('Conectado a MongoDB');

    // Borrar todos los productos
    const result = await ProductModel.deleteMany({});

    logger.info(`Borrados ${result.deletedCount} productos`);
    process.exit(0);
  } catch (error) {
    logger.error('Error al borrar productos:', error);
    process.exit(1);
  }
}

clearProducts();
