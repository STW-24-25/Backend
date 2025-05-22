import dotenv from 'dotenv';

dotenv.config();

import mongoose from 'mongoose';
import ProductModel from '../models/product.model';
import logger from '../utils/logger';
import fs from 'fs';
import connectDB from '../utils/db';

async function getUniqueProductNames() {
  try {
    // Conectar a la base de datos
    await connectDB();
    logger.info('Conectado a MongoDB');

    // Obtener todos los nombres únicos de productos
    const uniqueProducts = await ProductModel.distinct('name');

    // Guardar los nombres en un archivo
    fs.writeFileSync('unique_product_names.json', JSON.stringify(uniqueProducts, null, 2));

    logger.info(`Se encontraron ${uniqueProducts.length} productos únicos`);
    logger.info('Los nombres se han guardado en unique_product_names.json');
  } catch (error) {
    logger.error('Error al obtener los nombres de productos:', error);
  } finally {
    await mongoose.disconnect();
    logger.info('Desconectado de MongoDB');
  }
}

// Ejecutar el script
getUniqueProductNames();
