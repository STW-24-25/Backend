import { LambdaClient } from '@aws-sdk/client-lambda';
import logger from '../utils/logger';

// Verificar variables de entorno requeridas
if (!process.env.AWS_REGION) {
  throw new Error('AWS_REGION no está definido en las variables de entorno');
}
if (!process.env.AWS_ACCESS_KEY_ID) {
  throw new Error('AWS_ACCESS_KEY_ID no está definido en las variables de entorno');
}
if (!process.env.AWS_SECRET_ACCESS_KEY) {
  throw new Error('AWS_SECRET_ACCESS_KEY no está definido en las variables de entorno');
}
if (!process.env.NOTIFICATION_LAMBDA_FUNCTION_NAME) {
  throw new Error('NOTIFICATION_LAMBDA_FUNCTION_NAME no está definido en las variables de entorno');
}

// Lambda Configuration Constants
export const LAMBDA_CONFIG = {
  REGION: process.env.AWS_REGION,
  FUNCTIONS: {
    NOTIFICATION: process.env.NOTIFICATION_LAMBDA_FUNCTION_NAME,
  },
} as const;

// Verificar configuración de Lambda
logger.info('Configuración de Lambda:');
logger.info(`Region: ${LAMBDA_CONFIG.REGION}`);
logger.info(`Notification Function: ${LAMBDA_CONFIG.FUNCTIONS.NOTIFICATION}`);

// Lambda Client Configuration
export const lambdaClient = new LambdaClient({
  region: LAMBDA_CONFIG.REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
