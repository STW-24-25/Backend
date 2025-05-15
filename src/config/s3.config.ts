import { S3Client } from '@aws-sdk/client-s3';
import logger from '../utils/logger';

// Verificar variables de entorno requeridas
if (!process.env.S3_BUCKET_NAME) {
  throw new Error('S3_BUCKET_NAME no está definido en las variables de entorno');
}
if (!process.env.AWS_REGION) {
  throw new Error('AWS_REGION no está definido en las variables de entorno');
}
if (!process.env.AWS_ACCESS_KEY_ID) {
  throw new Error('AWS_ACCESS_KEY_ID no está definido en las variables de entorno');
}
if (!process.env.AWS_SECRET_ACCESS_KEY) {
  throw new Error('AWS_SECRET_ACCESS_KEY no está definido en las variables de entorno');
}

// S3 Configuration Constants
export const S3_CONFIG = {
  BUCKET_NAME: process.env.S3_BUCKET_NAME,
  REGION: process.env.AWS_REGION,
  MAX_FILE_SIZE: 2 * 1024 * 1024, // 2MB
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png'],
  IMAGE_DIMENSIONS: {
    WIDTH: 500,
    HEIGHT: 500,
  },
  PATHS: {
    USER_PROFILE: 'users/profile-pictures',
    PRODUCT_IMAGES: 'products/images',
  },
  DEFAULT_IMAGES: {
    USER_PROFILE: 'defaults/default-profile.jpg', // Imagen de perfil predeterminada
  },
} as const;

// Verificar configuración de S3
logger.info('Configuración de S3:');
logger.info(`Bucket Name: ${S3_CONFIG.BUCKET_NAME}`);
logger.info(`Region: ${S3_CONFIG.REGION}`);

// S3 Client Configuration
export const s3Client = new S3Client({
  region: S3_CONFIG.REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
