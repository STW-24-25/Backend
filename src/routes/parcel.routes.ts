import { Router } from 'express';
import * as parcelController from '../controllers/parcel.controller';
import { validateSchema } from '../middleware/validator';
import * as parcelRequestSchemas from '../middleware/validator/parcel.schemas';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// todo adjust to new parcel schema

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
 *                  type: object
 *                  properties:
 *                    geoJSON:
 *                      type: object
 *                      properties:
 *                        type:
 *                          type: string
 *                        features:
 *                          type: array
 *                          items:
 *                            type: object
 *                            properties:
 *                              type:
 *                                type: string
 *                              geometry:
 *                                type: object
 *                    products:
 *                      type: array
 *                      items:
 *                        type: string
 *                    createdAt:
 *                      type: string
 *                      format: date-time
 *                    municipality:
 *                      type: string
 *                    province:
 *                      type: string
 *                    size:
 *                      type: number
 *                weather:
 *                  type: object
 *                  properties:
 *                    main:
 *                      type: object
 *                      properties:
 *                        temp:
 *                          type: number
 *                          description: Current temperature in Celsius
 *                        humidity:
 *                          type: number
 *                          description: Current humidity percentage
 *                        temp_max:
 *                          type: number
 *                          description: Maximum temperature in Celsius
 *                        temp_min:
 *                          type: number
 *                          description: Minimum temperature in Celsius
 *                        pressure_max:
 *                          type: number
 *                          description: Maximum pressure in hPa
 *                        pressure_min:
 *                          type: number
 *                          description: Minimum pressure in hPa
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
 *                        snow:
 *                          type: number
 *                          description: Snow amount in mm
 *                    solar:
 *                      type: object
 *                      properties:
 *                        radiation:
 *                          type: number
 *                          description: Solar radiation
 *                    description:
 *                      type: string
 *                      description: Weather condition description
 *                    icon:
 *                      type: string
 *                      description: Weather icon code
 *                    date:
 *                      type: string
 *                      format: date
 *                    time_max_temp:
 *                      type: string
 *                    time_min_temp:
 *                      type: string
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
 *     parameters:
 *       - $ref: '#/components/parameters/getAllParcelsCropParameterSchema'
 *       - $ref: '#/components/parameters/getAllParcelsSizeParameterSchema'
 *       - $ref: '#/components/parameters/getAllParcelsAutonomousCommunityParameterSchema'
 *       - $ref: '#/components/parameters/getAllParcelsLimitParameterSchema'
 *       - $ref: '#/components/parameters/getAllParcelsSkipParameterSchema'
 *     responses:
 *       200:
 *         description: Parcels retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   municipio:
 *                     type: string
 *                     description: Municipality name
 *                   ubicacion:
 *                     type: array
 *                     items:
 *                       type: number
 *                     description: Coordinates of the parcel [lat, lng]
 *                   producto:
 *                     type: string
 *                     description: Main product of the parcel
 *                 example:
 *                   municipio: "Madrid"
 *                   ubicacion: [40.4168, -3.7038]
 *                   producto: "Tomate"
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
