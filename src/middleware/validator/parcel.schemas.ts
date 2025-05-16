import { z } from 'zod';
import { AutonomousComunity } from '../../models/user.model';
import { CropType } from '../../models/parcel.model';
import { isValidObjectId } from 'mongoose';

/**
 * @swagger
 * components:
 *  requestBodies:
 *    createParcel:
 *      type: object
 *      required:
 *        - size
 *        - crop
 *        - location
 *        - autonomousCommunity
 *      properties:
 *        crop:
 *          $ref: '#/components/schemas/CropType'
 *        location:
 *          type: object
 *          properties:
 *            lat:
 *              type: number
 *            lng:
 *              type: number
 *        products:
 *          type: array
 *          items:
 *            type: string
 *            format: MongoId
 */
export const newParcelSchema = z.object({
  body: z.object({
    crop: z.nativeEnum(CropType),
    location: z.object({
      lat: z.number(),
      lng: z.number(),
    }),
    products: z
      .string()
      .refine(val => isValidObjectId(val))
      .array()
      .optional(),
  }),
});

/**
 * @swagger
 * components:
 *  parameters:
 *    getParcelLatParameterSchema:
 *      in: query
 *      name: lat
 *      schema:
 *        type: number
 *        format: float
 *        minimum: -85
 *        maximum: 85
 *      required: true
 *      description: Latitude of the parcel
 *    getParcelLngParameterSchema:
 *      in: query
 *      name: lng
 *      schema:
 *        type: number
 *        format: float
 *        minimum: -180
 *        maximum: 180
 *      required: true
 *      description: Longitude of the parcel
 */
export const getParcelSchema = z.object({
  query: z.object({
    lat: z.string(),
    // .min(-85, { message: 'Latitude must be greater than or equal to -85' })
    // .max(85, { message: 'Latitude must be less than or equal to 85' }),
    lng: z.string(),
    // .min(-180, { message: 'Longitude must be greater than or equal to -180' })
    // .max(180, { message: 'Longitude must be less than or equal to 180' }),
  }),
});

/**
 * @swagger
 * components:
 *  requestBodies:
 *    updateParcel:
 *      type: object
 *      properties:
 *        size:
 *          type: number
 *          description: Tamaño de la parcela en hectáreas
 *        crop:
 *          $ref: '#/components/schemas/CropType'
 *        location:
 *          type: object
 *          properties:
 *            lat:
 *              type: number
 *            lng:
 *              type: number
 *        autonomousCommunity:
 *          $ref: '#/components/schemas/AutonomousCommunity'
 */
export const updateParcelSchema = z.object({
  body: z.object({
    size: z.number().optional(),
    crop: z.nativeEnum(CropType).optional(),
    location: z
      .object({
        lat: z.number(),
        lng: z.number(),
      })
      .optional(),
    autonomousCommunity: z.nativeEnum(AutonomousComunity).optional(),
  }),
});

/**
 * @swagger
 * components:
 *  parameters:
 *    getAllParcelsCropParameterSchema:
 *      in: query
 *      name: crop
 *      schema:
 *        $ref: '#/components/schemas/CropType'
 *      required: false
 *      description: Filter parcels by crop type
 *    getAllParcelsSizeParameterSchema:
 *      in: query
 *      name: size
 *      schema:
 *        type: number
 *      required: false
 *      description: Filter parcels by size in hectares
 *    getAllParcelsAutonomousCommunityParameterSchema:
 *      in: query
 *      name: autonomousCommunity
 *      schema:
 *        $ref: '#/components/schemas/AutonomousCommunity'
 *      required: false
 *      description: Filter parcels by autonomous community
 *    getAllParcelsLimitParameterSchema:
 *      in: query
 *      name: limit
 *      schema:
 *        type: string
 *        pattern: '^[1-9][0-9]*$'
 *      required: false
 *      description: Limit the number of parcels returned (must be a positive number)
 *    getAllParcelsSkipParameterSchema:
 *      in: query
 *      name: skip
 *      schema:
 *        type: string
 *        pattern: '^[0-9]+$'
 *      required: false
 *      description: Number of parcels to skip (must be zero or a positive number)
 */
export const getAllParcelsSchema = z.object({
  query: z.object({
    crop: z.nativeEnum(CropType).optional(),
    size: z.number().optional(),
    autonomousCommunity: z.nativeEnum(AutonomousComunity).optional(),
    limit: z
      .string()
      .optional()
      .refine(val => !val || (!isNaN(Number(val)) && Number(val) > 0), {
        message: 'Limit debe ser un número positivo',
      }),
    skip: z
      .string()
      .optional()
      .refine(val => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
        message: 'Skip debe ser un número positivo o cero',
      }),
  }),
});
