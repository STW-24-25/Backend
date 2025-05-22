import { Request, Response } from 'express';
import notificationService from '../services/notification.service';
import logger from '../utils/logger';

/**
 * Controlador para gestionar las notificaciones en la aplicación.
 * Provee endpoints para procesar alertas meteorológicas y administrar suscripciones.
 */
/**
 * Procesa alertas meteorológicas y notifica a usuarios afectados
 * @route POST /api/notifications/weather-alerts
 * @access Privado (solo administradores)
 */
export const processWeatherAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { alerts } = req.body;

    if (!alerts || !Array.isArray(alerts)) {
      res.status(400).json({
        success: false,
        message: 'Se requiere un array de alertas meteorológicas',
      });
      return;
    }

    const notificationCount = await notificationService.processWeatherAlerts(alerts);

    res.status(200).json({
      success: true,
      message: `Se procesaron ${alerts.length} alertas y se enviaron ${notificationCount} notificaciones`,
      data: { notificationCount },
    });
  } catch (error: any) {
    logger.error('Error al procesar alertas meteorológicas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar alertas meteorológicas',
      error: error.message,
    });
  }
};

/**
 * Envía una notificación de prueba a un usuario
 * @route POST /api/notifications/test/:userId
 * @access Privado (solo administradores)
 */
export const testNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { data } = req.body;

    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'Se requiere un ID de usuario',
      });
      return;
    }

    if (!data) {
      res.status(400).json({
        success: false,
        message: 'Se requieren datos para la notificación',
      });
      return;
    }

    const success = await notificationService.notifyUser(userId, data);

    if (!success) {
      res.status(404).json({
        success: false,
        message: 'No se pudo enviar la notificación. Verifique que el usuario exista.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Notificación de prueba enviada correctamente',
    });
  } catch (error: any) {
    logger.error('Error al enviar notificación de prueba:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar notificación de prueba',
      error: error.message,
    });
  }
};
