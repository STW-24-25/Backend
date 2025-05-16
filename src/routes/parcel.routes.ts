import { Router } from 'express';
import * as parcelController from '../controllers/parcel.controller';
import { validateSchema } from '../middleware/validator';
import * as parcelRequestSchemas from '../middleware/validator/parcel.schemas';
import { authenticateJWT } from '../middleware/auth';

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
 *      - $ref: '#/components/parameters/getParcelLatParameterSchema'
 *      - $ref: '#/components/parameters/getParcelLngParameterSchema'
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
 *                    main:
 *                      type: object
 *                      properties:
 *                        temperature:
 *                          type: number
 *                          description: Current temperature in Celsius
 *                        windChillFactor:
 *                          type: number
 *                          description: Wind chill factor, also known as thermal sensation or feels-like temperature
 *                        relativeHumidity:
 *                          type: number
 *                          description: Current humidity percentage
 *                        skyState:
 *                          type: string
 *                          description: Current sky state (in spanish)
 *                    wind:
 *                      type: object
 *                      properties:
 *                        speed:
 *                          type: number
 *                          description: Wind speed in m/s
 *                        gust:
 *                          type: number
 *                          description: Wind gust speed in m/s
 *                        direction:
 *                          type: number
 *                          description: Wind direction in degrees
 *                    precipitation:
 *                      type: object
 *                      properties:
 *                        rain:
 *                          type: number
 *                          description: Rain amount in mm
 *                        rainChance:
 *                          type: number
 *                          description: Rain probability in percentage
 *                        snow:
 *                          type: number
 *                          description: Snow amount in mm
 *                        snowChance:
 *                          type: number
 *                          description: Snow probability in percentage
 *                        stormChance:
 *                          type: number
 *                          description: Storm probability in percentage
 *                    date:
 *                      type: string
 *                      format: date
 *                    hour:
 *                      type: number
 *                    distance:
 *                      type: number
 *                      description: Distance in kilometers to the closest municipality
 *                    municipality:
 *                      type: string
 *                      description: Name of the municipality
 *      400:
 *        description: Invalid coordinates provided
 *      401:
 *        description: Authentication required
 *      404:
 *        description: No parcel found at the specified coordinates
 *      500:
 *        description: Error retrieving parcel
 */
router.get(
  '/',
  authenticateJWT(),
  validateSchema(parcelRequestSchemas.getParcelSchema),
  parcelController.getParcel,
);

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
router.post(
  '/',
  authenticateJWT(),
  validateSchema(parcelRequestSchemas.newParcelSchema),
  parcelController.createParcel,
);

/**
 * @swagger
 * /api/parcels/all:
 *   get:
 *     summary: Get all parcels for a user
 *     tags: [Parcel]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Parcels retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Parcel'
 *       400:
 *         description: Bad request, schema validation failed
 *       401:
 *         description: Authentication required
 *       404:
 *         description: No parcels found for the user
 *       500:
 *         description: Error retrieving parcels
 */
router.get(
  '/all',
  authenticateJWT(),
  validateSchema(parcelRequestSchemas.getAllParcelsSchema),
  parcelController.getParcels,
);

export default router;
