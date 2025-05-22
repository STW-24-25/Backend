import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import logger from '../utils/logger';

/**
 * Handler para la función Lambda que envía notificaciones a través de SNS.
 * Esta función es invocada por AWS Lambda cuando se necesita enviar una notificación.
 *
 * @param event - Objeto con la información de la notificación
 * @returns Resultado de la operación
 */
export const handler = async (event: any) => {
  try {
    logger.info('Procesando evento de notificación:', JSON.stringify(event));

    // Configurar cliente de AWS SNS
    const snsClient = new SNSClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });

    const { userId, email, phoneNumber, notificationType, data, notificationMethod } = event;

    // Verificar datos requeridos
    if (!userId || !notificationType || !data) {
      logger.error('Faltan datos requeridos para la notificación');
      return { statusCode: 400, body: 'Faltan datos requeridos' };
    }

    const notificationPromises = [];

    // Por defecto, enviamos a través del tópico SNS si no se especifica método
    const method = notificationMethod || 'TOPIC';

    // Publicar mensaje en el tópico SNS
    if (method === 'TOPIC' && process.env.SNS_TOPIC_ARN) {
      notificationPromises.push(publishToTopic(snsClient, notificationType, data, userId));
    }

    // Enviar SMS directamente solo si se especifica el método DIRECT_SMS
    if (method === 'DIRECT_SMS' && phoneNumber) {
      notificationPromises.push(
        sendSMSNotification(snsClient, phoneNumber, notificationType, data),
      );
    }

    // Esperar a que se completen todas las notificaciones
    await Promise.all(notificationPromises);

    return {
      statusCode: 200,
      body: 'Notificación enviada correctamente',
    };
  } catch (error) {
    logger.error('Error procesando la notificación:', error);
    return {
      statusCode: 500,
      body: 'Error al procesar la notificación',
    };
  }
};

/**
 * Publica un mensaje en un tópico SNS
 */
async function publishToTopic(
  snsClient: SNSClient,
  notificationType: string,
  data: any,
  userId: string,
) {
  try {
    // Formatear mensaje para el tópico
    const message = formatTopicMessage(notificationType, data);

    const command = new PublishCommand({
      TopicArn: process.env.SNS_TOPIC_ARN,
      Message: message,
      Subject: getNotificationSubject(notificationType, data),
      MessageAttributes: {
        notificationType: {
          DataType: 'String',
          StringValue: notificationType,
        },
        userId: {
          DataType: 'String',
          StringValue: userId,
        },
      },
    });

    const result = await snsClient.send(command);
    logger.info(`Mensaje publicado en tópico SNS: ${result.MessageId}`);
    return true;
  } catch (error) {
    logger.error('Error publicando mensaje en tópico SNS:', error);
    return false;
  }
}

/**
 * Envía una notificación por SMS
 */
async function sendSMSNotification(
  snsClient: SNSClient,
  phoneNumber: string,
  notificationType: string,
  data: any,
) {
  try {
    // Formatear mensaje SMS según el tipo de notificación
    const message = formatSMSMessage(notificationType, data);

    const command = new PublishCommand({
      PhoneNumber: phoneNumber,
      Message: message,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional',
        },
        'AWS.SNS.SMS.SenderID': {
          DataType: 'String',
          StringValue: 'AgroAlert',
        },
      },
    });

    await snsClient.send(command);
    logger.info(`SMS enviado a ${phoneNumber}`);
    return true;
  } catch (error) {
    logger.info('Error enviando SMS:', error);
    return false;
  }
}

/**
 * Obtiene el asunto de la notificación según su tipo
 */
function getNotificationSubject(notificationType: string, data: any): string {
  switch (notificationType) {
    case 'WEATHER_ALERT':
      return `Alerta Meteorológica: ${data.nivel} - ${data.fenomeno}`;
    default:
      return `Notificación: ${notificationType}`;
  }
}

/**
 * Formatea un mensaje para enviar al tópico SNS
 */
function formatTopicMessage(notificationType: string, data: any): string {
  switch (notificationType) {
    case 'WEATHER_ALERT':
      return `ALERTA METEOROLÓGICA EN TU PARCELA
Nivel: ${data.nivel}
Fenómeno: ${data.fenomeno}
Área afectada: ${data.areaDesc}
Descripción: ${data.descripcion}
Urgencia: ${data.urgency}
Instrucciones: ${data.instruction}

Esta es una notificación automática. Por favor, no responda a este mensaje.`;
    default:
      return JSON.stringify(data);
  }
}

/**
 * Formatea un mensaje SMS según el tipo de notificación
 */
function formatSMSMessage(notificationType: string, data: any) {
  switch (notificationType) {
    case 'WEATHER_ALERT':
      return `ALERTA: ${data.nivel} - ${data.fenomeno}. ${data.descripcion}. ${data.instruction}`;
    default:
      return JSON.stringify(data);
  }
}
