import dotenv from 'dotenv';

dotenv.config();

import path from 'path';
import mongoose from 'mongoose';
import ProductModel from '../models/product.model';
import logger from '../utils/logger';
import fs from 'fs';
import ProductService from '../services/product.service';
import { Document } from 'mongoose';
import connectDB from '../utils/db';

// Verificar variables de entorno
logger.info('Verificando variables de entorno...');
logger.info(`S3_BUCKET_NAME: ${process.env.S3_BUCKET_NAME}`);
logger.info(`AWS_REGION: ${process.env.AWS_REGION}`);
logger.info(
  `AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? 'Configurada' : 'No configurada'}`,
);
logger.info(
  `AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? 'Configurada' : 'No configurada'}`,
);

interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  image?: string;
}

// Mapeo de nombres de productos a nombres base para imágenes
const productImageMapping: { [key: string]: string } = {
  // Aceites
  'Aceite de oliva lampante': 'aceite_oliva',
  'Aceite de oliva lampante >2º': 'aceite_oliva',
  'Aceite de oliva refinado': 'aceite_oliva',
  'Aceite de oliva virgen extra, <0,8º': 'aceite_oliva',
  'Aceite de oliva virgen, 0,8-2º': 'aceite_oliva',
  'Aceite de orujo de oliva crudo': 'aceite_orujo',
  'Aceite de orujo de oliva refinado': 'aceite_orujo',
  'Aceite de oliva orujo crudo': 'aceite_orujo',
  'Aceite de oliva orujo refinado': 'aceite_orujo',
  'Aceite de girasol refinado': 'aceite_girasol',
  'Aceite de girasol refinado alto oleico': 'aceite_girasol',
  'Aceite de girasol refinado convencional': 'aceite_girasol',
  'Aceite refinado de soja': 'aceite_soja',

  // Huevos
  'Huevos Clase L': 'huevos',
  'Huevos Clase M': 'huevos',
  'Huevos Ecológicos - Clase L': 'huevos',
  'Huevos Ecológicos - Clase M': 'huevos',
  'Huevos Ecológicos, media Clase L y M': 'huevos',
  'Huevos Tipo Campero, media Clases L y M': 'huevos',
  'Huevos Tipo Campero. Mezcla Clases L y M': 'huevos',
  'Huevos Tipo Jaula, media Clases L y M': 'huevos',
  'Huevos Tipo Jaula. Clase L': 'huevos',
  'Huevos Tipo Jaula. Clase M': 'huevos',
  'Huevos Tipo Suelo Clase L': 'huevos',
  'Huevos Tipo Suelo Clase M': 'huevos',
  'Huevos Tipo Suelo, media Clases L y M': 'huevos',
  'Huevos tipo gallina suelta en gallinero - Clase L': 'huevos',
  'Huevos tipo gallina suelta en gallinero - Clase M': 'huevos',
  'Huevos tipo gallina suelta en gallinero, media Clase L y M': 'huevos',
  'Huevos tipo jaula acondicionada - Clase L': 'huevos',
  'Huevos tipo jaula acondicionada - Clase M': 'huevos',
  'Huevos tipo jaula acondicionada, media Clase L y M': 'huevos',
  'Huevos, media Clases L y M': 'huevos',

  // Naranjas
  Naranja: 'naranja',
  'Naranja Lanelate': 'naranja',
  'Naranja Navel': 'naranja',
  'Naranja Navelate': 'naranja',
  'Naranja Navelina': 'naranja',
  'Naranja Salustiana': 'naranja',
  'Naranja Valencia Late': 'naranja',
  'Naranja. Grupo Navel': 'naranja',
  'Naranja. Grupo blancas': 'naranja',

  // Manzanas
  'Manzana Fuji': 'manzana_fuji',
  'Manzana Gala': 'manzana_gala',
  'Manzana Golden': 'manzana_golden',
  'Manzana Granny Smith': 'manzana_granny_smith',

  // Tomates
  'Tomate cereza': 'tomate_cereza',
  'Tomate liso': 'tomate_liso',
  'Tomate racimo': 'tomate_racimo',
  'Tomate redondo liso': 'tomate_liso_redondo',

  // Pipa de Girasol
  'Pipa de girasol 9-2-44': 'pipa_girasol',
  'Pipa de girasol alto oleico': 'pipa_girasol',
  'Pipa de girasol convencional': 'pipa_girasol',

  // Pollo
  Pollo: 'pollo',
  'Pollo P10': 'pollo',
  'Pollo P90': 'pollo',
  'Pollo: Cuartos traseros': 'pollo_cuartos_traseros',
  'Pollo: Filete de pechuga': 'pollo_filete_pechuga',

  // Porcino
  'Porcino 50-45% magro': 'porcino',
  'Porcino 55-50% magro': 'porcino',
  'Porcino 60-55% magro': 'porcino',

  // Corderos
  'Corderos 12-16 kilos': 'cordero',
  'Corderos Ligeros': 'cordero',
  'Corderos Pesados': 'cordero',

  // Animales
  'Animales 8-12 meses': 'bovino',
  'Machos 12-24 meses': 'bovino',
  'Machos 12-24 meses,': 'bovino',
  'Lechón 20 kg': 'lechon',

  // Arroz
  'Arroz blanco': 'arroz',
  'Arroz blanco japónica': 'arroz',
  'Arroz blanco vaporizado': 'arroz',
  'Arroz blanco índica': 'arroz',
  'Arroz cáscara índica': 'arroz',
  'Arroz partido': 'arroz',

  // Verduras
  Acelga: 'acelgas',
  Aguacate: 'aguacate',
  'Ajo seco': 'ajo',
  Alcachofa: 'alcachofa',
  Berenjena: 'berenjena',
  Brócoli: 'brocoli',
  Calabacín: 'calabacin',
  Cebolla: 'cebolla',
  Champiñón: 'champiñon',
  'Col-repollo': 'col',
  'Col-repollo hoja lisa': 'col',
  Coliflor: 'coliflor',
  Escarola: 'escarola',
  Espinaca: 'espinaca',
  'Haba verde': 'haba',
  'Judía verde tipo plana': 'judía',
  'Lechuga romana': 'lechuga',
  Patata: 'patata',
  Pepino: 'pepino',
  'Pepino, conjunto tipos': 'pepino',
  'Pimiento verde tipo italiano': 'pimiento',
  Puerro: 'puerro',
  Zanahoria: 'zanahoria',

  // Frutas
  'Ciruela, conjunto de variedades': 'ciruela',
  Clementina: 'clementina',
  Fresa: 'fresa',
  Fresón: 'fresa',
  Granada: 'granada',
  'Higos y brevas': 'higo',
  Limón: 'limon',
  Mandarina: 'mandarina',
  Níspero: 'nispero',
  'Pera Blanquilla': 'pera',
  'Pera Conferencia': 'pera',
  Plátano: 'platano',

  // Cereales y Legumbres
  'Cebada malta': 'cebada',
  'Cebada pienso': 'cebada',
  'Colza grano': 'colza',
  Garbanzos: 'garbanzo',
  'Guisantes secos': 'guisante',
  'Habas secas': 'haba',
  Lentejas: 'lenteja',
  'Maíz grano': 'maiz',
  'Trigo duro': 'trigo',

  // Lácteos
  'Leche de Vaca': 'leche',
  'Mantequilla sin sal en bloques de 25 kg': 'mantequilla',
  'Nata 30% materia grasa': 'nata',
  'Queso fresco de vaca': 'queso',
  'Suero de leche en polvo': 'suero',

  // Otros
  Alfalfa: 'alfalfa',
  'Alfalfa. Pellets estándar. 14%-16% proteina': 'alfalfa',
  'Alfalfa.Balas 1ª categoría, 16,5-18% proteína': 'alfalfa',
  'Bovino vivo': 'bovino',
  'Conejo 1,8-2,2': 'conejo',
  'Miel multifloral envasada': 'miel',
  'Polen a granel': 'polen',
  'Polen envasado': 'polen',
  'Torta de girasol': 'torta_girasol',
  'Torta de soja': 'torta_soja',
  'Vino tinto sin DOP/IGP , 12 p. color': 'vino',
  Melocotón: 'melocoton',
  'Uva de mesa': 'uva',
  'Melón Piel de Sapo': 'melon',
  'Cereza, conjunto de variedades': 'cereza',
  Sandía: 'sandia',
  Albaricoque: 'albaricoque',
  'Espárrago Verde': 'esparrago_verde',
  'Aceituna de mesa Gordal': 'aceituna_mesa_gordal',
  'Aceituna de mesa Hojiblanca': 'aceituna_mesa_hojiblanca',
  'Aceituna de mesa Manzanilla': 'aceituna_mesa_manzanilla',
  'Aceituna de mesa Media de variedades': 'aceituna_mesa_media',
  Satsuma: 'satsuma',
  Nectarina: 'nectarina',
  Caqui: 'caqui',
  'Nectarina carne amarilla': 'nectarina',
  'Nectarina carne blanca': 'nectarina_blanca',
  Espárrago: 'esparrago_blanco',
  'Aceituna de mesa Cacereña': 'aceituna_mesa_cacereña',
};

async function uploadProductImages() {
  try {
    // Conectar a la base de datos usando el módulo db
    await connectDB();
    logger.info('Conectado a MongoDB');

    // Obtener todos los productos
    const products = (await ProductModel.find({})) as IProduct[];
    logger.info(`Se encontraron ${products.length} productos`);

    // Directorio donde están las imágenes
    const imagesDir = path.join(__dirname, '../../product_images');

    // Verificar si el directorio existe
    if (!fs.existsSync(imagesDir)) {
      logger.error(`El directorio ${imagesDir} no existe`);
      return;
    }

    // Procesar cada producto
    for (const product of products) {
      try {
        // Buscar la imagen correspondiente al producto
        const imageFiles = fs.readdirSync(imagesDir);

        // Obtener el nombre base para la imagen
        let baseImageName = productImageMapping[product.name];

        // Si no hay mapeo directo, intentar encontrar una coincidencia aproximada
        if (!baseImageName) {
          // Limpiar el nombre del producto para búsqueda
          const cleanProductName = product.name
            .toLowerCase()
            .replace(/[.,]/g, '') // Eliminar puntos y comas
            .replace(/\s+/g, '_') // Reemplazar espacios por guiones bajos
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, ''); // Eliminar acentos

          // Buscar coincidencia en los archivos de imagen
          const matchingFile = imageFiles.find(file => {
            const cleanFileName = file
              .toLowerCase()
              .replace(/\.[^/.]+$/, '') // Eliminar extensión
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, ''); // Eliminar acentos
            return (
              cleanFileName.includes(cleanProductName) || cleanProductName.includes(cleanFileName)
            );
          });

          if (matchingFile) {
            baseImageName = matchingFile.replace(/\.[^/.]+$/, '');
          }
        }

        if (!baseImageName) {
          logger.warn(`No se encontró imagen para el producto: ${product.name}`);
          continue;
        }

        const productImage = imageFiles.find(file =>
          file.toLowerCase().includes(baseImageName.toLowerCase()),
        );

        if (!productImage) {
          logger.warn(`No se encontró imagen para el producto: ${product.name}`);
          continue;
        }

        // Leer el archivo de imagen
        const imagePath = path.join(imagesDir, productImage);
        const imageBuffer = fs.readFileSync(imagePath);

        // Crear un objeto File simulado para el servicio
        const mockFile = {
          buffer: imageBuffer,
          originalname: productImage,
          mimetype: 'image/jpeg',
          fieldname: 'image',
          encoding: '7bit',
          size: imageBuffer.length,
          destination: '',
          filename: productImage,
          path: imagePath,
        };

        // Usar el servicio de productos para subir la imagen
        await ProductService.uploadProductImage(product._id.toString(), mockFile as any);

        logger.info(`Imagen subida exitosamente para el producto: ${product.name}`);
      } catch (error) {
        logger.error(`Error al procesar el producto ${product.name}:`, error);
      }
    }

    logger.info('Proceso de subida de imágenes completado');
  } catch (error) {
    logger.error('Error en el proceso de subida de imágenes:', error);
  } finally {
    await mongoose.disconnect();
    logger.info('Desconectado de MongoDB');
  }
}

// Ejecutar el script
uploadProductImages();
