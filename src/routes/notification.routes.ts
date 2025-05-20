import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller';
import { authenticateJWT } from '../middleware/auth';
import { isAdmin } from '../middleware/admin';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: API para gestionar notificaciones
 */

/**
 * @swagger
 * /api/notifications/weather-alerts:
 *   post:
 *     summary: Procesa alertas meteorológicas y notifica a usuarios afectados
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - alerts
 *             properties:
 *               alerts:
 *                 type: array
 *                 description: Array de alertas meteorológicas en formato GeoJSON
 *     responses:
 *       200:
 *         description: Alertas procesadas correctamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 *       403:
 *         description: No tiene permisos de administrador
 *       500:
 *         description: Error del servidor
 */
router.post('/weather-alerts', authenticateJWT(), notificationController.processWeatherAlerts);

/**
 * @swagger
 * /api/notifications/test/{userId}:
 *   post:
 *     summary: Envía una notificación de prueba a un usuario
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID del usuario a notificar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *             properties:
 *               data:
 *                 type: object
 *                 description: Datos para la notificación
 *     responses:
 *       200:
 *         description: Notificación enviada correctamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 *       403:
 *         description: No tiene permisos de administrador
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error del servidor
 */
router.post('/test/:userId', authenticateJWT(), isAdmin(), notificationController.testNotification);

export default router;
