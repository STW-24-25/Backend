import { InvokeCommand } from '@aws-sdk/client-lambda';
import { lambdaClient } from '../config/lambda.config';
import logger from '../utils/logger';
import UserModel from '../models/user.model';
import ParcelModel from '../models/parcel.model';
import * as turf from '@turf/turf';

interface WeatherAlertData {
  type: string;
  geometry: {
    type: string;
    coordinates: number[][][];
  };
  properties: {
    nivel: string;
    fenomeno: string;
    areaDesc: string;
    descripcion: string;
    severity: string;
    certainty: string;
    urgency: string;
    instruction: string;
    [key: string]: any;
  };
}

interface NotificationPayload {
  userId: string;
  email: string;
  phoneNumber?: string;
  notificationType: string;
  data: any;
}

class NotificationService {
  /**
   * Envía una notificación a un usuario a través de Lambda, SMS y email
   * @param userId ID del usuario a notificar
   * @param data Datos para la notificación
   * @returns true si la notificación fue enviada correctamente
   */
  async notifyUser(userId: string, data: any): Promise<boolean> {
    try {
      logger.info(`Preparando notificación para usuario: ${userId}`);

      // Obtener la información del usuario
      const user = await UserModel.findById(userId);

      if (!user) {
        logger.warn(`Usuario no encontrado: ${userId}`);
        return false;
      }

      if (!user.email) {
        logger.warn(`Usuario ${userId} no tiene email configurado`);
        return false;
      }

      // Preparar la carga para la función Lambda
      const payload: NotificationPayload = {
        userId: userId,
        email: user.email,
        phoneNumber: user.phoneNumber,
        notificationType: 'WEATHER_ALERT',
        data: data,
      };

      // Enviar la notificación a través de Lambda
      const command = new InvokeCommand({
        FunctionName: process.env.NOTIFICATION_LAMBDA_FUNCTION_NAME,
        Payload: Buffer.from(JSON.stringify(payload)),
        InvocationType: 'Event', // Asíncrono para no bloquear
      });

      await lambdaClient.send(command);
      logger.info(`Notificación enviada a Lambda para el usuario: ${userId}`);

      return true;
    } catch (error) {
      logger.error(`Error al enviar notificación: ${error}`);
      return false;
    }
  }

  /**
   * Procesa alertas meteorológicas y notifica a los usuarios afectados
   * @param alerts Array de alertas meteorológicas en formato GeoJSON
   * @returns Número de notificaciones enviadas
   */
  async processWeatherAlerts(alerts: WeatherAlertData[]): Promise<number> {
    try {
      let notificationsSent = 0;

      for (const alert of alerts) {
        // Crear un polígono de Turf a partir de la alerta
        const alertPolygon = turf.polygon(alert.geometry.coordinates);

        // Buscar todas las parcelas que podrían estar afectadas
        const parcels = await ParcelModel.find();

        // Recopilar usuarios únicos para notificar
        const userIdsToNotify = new Set<string>();

        // Verificar cada parcela si está dentro o intersecta con el área de la alerta
        for (const parcel of parcels) {
          // Obtener el feature del polígono
          const polygonFeature = parcel.geometry.features.find(
            (f: any) => f.properties.name === 'polygon',
          );

          if (polygonFeature && polygonFeature.geometry.coordinates) {
            try {
              // Asegurarnos de que las coordenadas sean del tipo correcto para un polígono
              const coordinates = polygonFeature.geometry.coordinates;

              // Verificar si ya es un array anidado de coordenadas como se espera para un polígono
              if (
                Array.isArray(coordinates) &&
                Array.isArray(coordinates[0]) &&
                Array.isArray(coordinates[0][0])
              ) {
                const parcelPolygon = turf.polygon(coordinates as any);

                // Verificar si el polígono de la parcela intersecta con el polígono de la alerta
                const doesIntersect = turf.booleanIntersects(parcelPolygon, alertPolygon);

                if (doesIntersect) {
                  // Buscar el usuario propietario de esta parcela
                  const user = await UserModel.findOne({ parcels: parcel._id });

                  if (user && user._id) {
                    userIdsToNotify.add(user._id.toString());
                  }
                }
              } else {
                logger.warn(`Formato de polígono inválido para la parcela: ${parcel._id}`);
              }
            } catch (error) {
              logger.error(`Error al procesar geometría de parcela ${parcel._id}: ${error}`);
            }
          }
        }

        // Enviar notificaciones a los usuarios afectados
        for (const userId of userIdsToNotify) {
          const success = await this.notifyUser(userId, alert.properties);
          if (success) {
            notificationsSent++;
          }
        }
      }

      logger.info(
        `Proceso de alertas meteorológicas completado: ${notificationsSent} notificaciones enviadas`,
      );
      return notificationsSent;
    } catch (error) {
      logger.error(`Error al procesar alertas meteorológicas: ${error}`);
      return 0;
    }
  }
}

export default new NotificationService();
