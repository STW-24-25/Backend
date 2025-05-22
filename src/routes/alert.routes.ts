import { Router } from 'express';
import * as alertController from '../controllers/alert.controller';
import { authenticateJWT } from '../middleware/auth';
import { isAdmin } from '../middleware/admin';

const router = Router();

/**
 * @swagger
 * /api/alerts/weather:
 *   get:
 *     summary: Retrieve current weather alerts
 *     description: Returns GeoJSON data containing weather alerts with geographical boundaries and alert details
 *     tags:
 *       - Alerts
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Weather alerts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - type
 *                 - features
 *               properties:
 *                 type:
 *                   type: string
 *                   enum: [FeatureCollection]
 *                   description: GeoJSON type
 *                 features:
 *                   type: array
 *                   description: Collection of weather alert features
 *                   items:
 *                     type: object
 *                     required:
 *                       - type
 *                       - geometry
 *                       - properties
 *                     properties:
 *                       type:
 *                         type: string
 *                         enum: [Feature]
 *                         description: GeoJSON Feature type
 *                       geometry:
 *                         type: object
 *                         required:
 *                           - type
 *                           - coordinates
 *                         properties:
 *                           type:
 *                             type: string
 *                             enum: [Polygon]
 *                             description: GeoJSON geometry type
 *                           coordinates:
 *                             type: array
 *                             description: Array of polygon rings where the first ring is the outer boundary
 *                             items:
 *                               type: array
 *                               items:
 *                                 type: array
 *                                 items:
 *                                   type: number
 *                                 minItems: 2
 *                                 description: Coordinate pair [longitude, latitude]
 *                       properties:
 *                         type: object
 *                         properties:
 *                           nivel:
 *                             type: string
 *                             description: Alert level (verde, amarillo, naranja, rojo)
 *                             example: verde
 *                           fenomeno:
 *                             type: string
 *                             description: Weather phenomenon type
 *                             example: nieve
 *                           areaDesc:
 *                             type: string
 *                             description: Description of the affected area
 *                             example: Pirineo oscense
 *                           descripcion:
 *                             type: string
 *                             description: Detailed alert description
 *                             example: Aviso de aludes de nivel verde. CCAA
 *                           probabilidad:
 *                             type: string
 *                             description: Probability of occurrence
 *                             example: 40-70%
 *                           onset:
 *                             type: string
 *                             format: date-time
 *                             description: Start time of the alert
 *                             example: 2025-05-22T00:00:00+02:00
 *                           expires:
 *                             type: string
 *                             format: date-time
 *                             description: End time of the alert
 *                             example: 2025-05-22T23:59:59+02:00
 *                           effective:
 *                             type: string
 *                             format: date-time
 *                             description: Time when the alert was issued
 *                             example: 2025-05-19T23:50:01+02:00
 *                           severity:
 *                             type: string
 *                             description: Severity of the alert (Extreme, Severe, Moderate, Minor)
 *                             example: Minor
 *                           certainty:
 *                             type: string
 *                             description: Certainty of the alert (Observed, Likely, Possible, Unlikely, Unknown)
 *                             example: Likely
 *                           urgency:
 *                             type: string
 *                             description: Urgency of the alert (Immediate, Expected, Future, Past, Unknown)
 *                             example: Future
 *       401:
 *         description: Unauthorized - Authentication token is missing or invalid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Unauthorized - Authentication token is missing or invalid
 *       500:
 *         description: Internal server error - Failed to retrieve weather alerts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Failed to retrieve weather alerts
 */
router.get('/weather', authenticateJWT(), alertController.getWeatherAlerts);

/**
 * @swagger
 * /api/alerts/cache/status:
 *   get:
 *     summary: Get the status of the weather alerts cache
 *     description: Returns information about the current state of the weather alerts cache, including age and validity
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exists:
 *                   type: boolean
 *                   description: Whether the cache currently exists
 *                   example: true
 *                 age:
 *                   type: integer
 *                   nullable: true
 *                   description: Age of the cache in milliseconds (null if cache doesn't exist)
 *                   example: 1200000
 *                 isValid:
 *                   type: boolean
 *                   description: Whether the cache is considered valid (not expired)
 *                   example: true
 *                 lastUpdated:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                   description: ISO timestamp when the cache was last updated (null if cache doesn't exist)
 *                   example: "2025-05-19T12:30:45.123Z"
 *       401:
 *         description: Unauthorized - Authentication token is missing or invalid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Unauthorized - Authentication token is missing or invalid
 *       403:
 *         description: Forbidden - User does not have admin privileges
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Access denied - Admin privileges required
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Error retrieving cache status
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */
router.get('/cache/status', authenticateJWT(), isAdmin(), alertController.getAlertsCacheStatus);

/**
 * @swagger
 * /api/alerts/cache/refresh:
 *   post:
 *     summary: Force refresh the weather alerts cache
 *     description: Manually triggers a refresh of the weather alerts cache from AEMET API, regardless of current cache state
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Alerts cache refreshed successfully
 *                 status:
 *                   type: object
 *                   properties:
 *                     exists:
 *                       type: boolean
 *                       example: true
 *                     age:
 *                       type: integer
 *                       example: 500
 *                     isValid:
 *                       type: boolean
 *                       example: true
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-05-19T14:45:32.789Z"
 *       401:
 *         description: Unauthorized - Authentication token is missing or invalid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Unauthorized - Authentication token is missing or invalid
 *       403:
 *         description: Forbidden - User does not have admin privileges
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Access denied - Admin privileges required
 *       500:
 *         description: Internal server error - Failed to refresh cache
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Error refreshing alerts cache
 *                 error:
 *                   type: string
 *                   example: AEMET API connection timeout
 */
router.post('/cache/refresh', authenticateJWT(), isAdmin(), alertController.refreshAlertsCache);

export default router;
