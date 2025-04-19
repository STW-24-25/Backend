import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import * as statsCont from '../controllers/stats.controller';

const router = Router();

/**
 * @swagger
 * /api/stats:
 *  get:
 *    summary: Retrieve general statistics of the application (admin only).
 *    tags: [Stats]
 *    responses:
 *      200:
 *        description: Statistics retrieved succesfully
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                totalUsers:
 *                  type: integer
 *                totalBanned:
 *                  type: integer
 *                totalForums:
 *                  type: integer
 *                usersPerMonth:
 *                  type: array
 *                  items:
 *                    type: object
 *                    properties:
 *                      year:
 *                        type: integer
 *                      month:
 *                        type: integer
 *                      userCount:
 *                        type: integer
 *                usersByAutCom:
 *                  type: array
 *                  items:
 *                    type: object
 *                    properties:
 *                      autonomousCommunity:
 *                        $ref: '#/components/schemas/AutonomousCommunity'
 *                      userCount:
 *                        type: integer
 *                usersByRole:
 *                  type: array
 *                  items:
 *                    type: object
 *                    properties:
 *                      role:
 *                        $ref: '#/components/schemas/UserRole'
 *                      userCount:
 *                        type: integer
 *                loginsPerMonth:
 *                  type: array
 *                  items:
 *                    type: object
 *                    properties:
 *                      year:
 *                        type: integer
 *                      month:
 *                        type: integer
 *                      userCount:
 *                        type: integer
 *                loginsPerHour:
 *                  type: array
 *                  items:
 *                    type: object
 *                    properties:
 *                      hour:
 *                        type: integer
 *                      userCount:
 *                        type: integer
 */
router.get('/', authenticateJWT(), statsCont.getAllStats);

export default router;
