import { Router } from 'express';
import * as parcelController from '../controllers/parcel.controller';
import { validateSchema } from '../middleware/validator';
import { newParcelSchema } from '../middleware/validator/parcel.schemas';
import { authenticateJWT } from '../middleware/auth'; // Assuming you have an auth middleware

const router = Router();

/**
 * @swagger
 * /api/parcels:
 *  get:
 *    summary: Get parcel information by coordinates
 *    tags: [Parcel]
 *    security:
 *      - bearerAuth: []
 *    parameters:
 *      - in: query
 *        name: lng
 *        schema:
 *          type: number
 *        required: true
 *        description: Longitude coordinate
 *      - in: query
 *        name: lat
 *        schema:
 *          type: number
 *        required: true
 *        description: Latitude coordinate
 *    responses:
 *      200:
 *        description: Parcel information retrieved successfully
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                parcel:
 *                  $ref: '#/components/schemas/Parcel'
 *                weather:
 *                  type: object
 *                  properties:
 *                    temperature:
 *                      type: number
 *                      description: Current temperature in Celsius
 *                    humidity:
 *                      type: number
 *                      description: Current humidity percentage
 *                    windSpeed:
 *                      type: number
 *                      description: Wind speed in m/s
 *                    description:
 *                      type: string
 *                      description: Weather condition description
 *                    icon:
 *                      type: string
 *                      description: Weather icon code
 *      400:
 *        description: Invalid coordinates provided
 *      401:
 *        description: Authentication required
 *      404:
 *        description: No parcel found at the specified coordinates
 *      500:
 *        description: Error retrieving parcel
 */
router.get('/', authenticateJWT, parcelController.getParcel);

/**
 * @swagger
 * /api/parcels:
 *  post:
 *    summary: Create a new parcel
 *    tags: [Parcel]
 *    security:
 *      - bearerAuth: []
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/requestBodies/createParcel'
 *    responses:
 *      201:
 *        description: Parcel created successfully
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                message:
 *                  type: string
 *                parcel:
 *                  $ref: '#/components/schemas/Parcel'
 *      400:
 *        description: Bad request, schema validation failed
 *      401:
 *        description: Authentication required
 *      500:
 *        description: Error creating parcel
 */
router.post('/', authenticateJWT, validateSchema(newParcelSchema), parcelController.createParcel);

export default router;
