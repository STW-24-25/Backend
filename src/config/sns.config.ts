import { SNSClient } from '@aws-sdk/client-sns';
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

// SNS Configuration Constants
export const SNS_CONFIG = {
  TOPIC_ARN: process.env.SNS_TOPIC_ARN,
  REGION: process.env.AWS_REGION,
  SMS_ATTRIBUTES: {
    DEFAULT_SENDER_ID: 'AgroAlert',
    DEFAULT_SMS_TYPE: 'Transactional',
  },
  NOTIFICATION_TYPES: {
    WEATHER_ALERT: 'WEATHER_ALERT',
    SYSTEM_NOTIFICATION: 'SYSTEM_NOTIFICATION',
  },
} as const;

// Verificar configuración de SNS
logger.info('Configuración de SNS:');
logger.info(`Region: ${SNS_CONFIG.REGION}`);
logger.info(`Topic ARN: ${SNS_CONFIG.TOPIC_ARN || 'No configurado'}`);

// SNS Client Configuration
export const snsClient = new SNSClient({
  region: SNS_CONFIG.REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
