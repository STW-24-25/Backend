import { z } from 'zod';
import { AutonomousComunity } from '../../models/user.model';
import { CropType, ParcelSize } from '../../models/parcel.model';

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
 *        size:
 *          $ref: '#/components/schemas/ParcelSize'
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
export const newParcelSchema = z.object({
  body: z.object({
    size: z.nativeEnum(ParcelSize),
    products: z.string().array().optional(),
    location: z.object({
      lat: z.number(),
      lng: z.number(),
    }),
    autonomousCommunity: z.nativeEnum(AutonomousComunity),
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
 *          $ref: '#/components/schemas/ParcelSize'
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
    size: z.nativeEnum(ParcelSize).optional(),
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
 *      description: Tipo de cultivo para filtrar
 *    getAllParcelsSizeParameterSchema:
 *      in: query
 *      name: size
 *      schema:
 *        $ref: '#/components/schemas/ParcelSize'
 *      required: false
 *      description: Tamaño de parcela para filtrar
 *    getAllParcelsAutonomousCommunityParameterSchema:
 *      in: query
 *      name: autonomousCommunity
 *      schema:
 *        $ref: '#/components/schemas/AutonomousCommunity'
 *      required: false
 *      description: Comunidad autónoma para filtrar
 *    getAllParcelsUserParameterSchema:
 *      in: query
 *      name: user
 *      schema:
 *        type: string
 *      required: false
 *      description: ID del usuario propietario para filtrar
 *    getAllParcelsLimitParameterSchema:
 *      in: query
 *      name: limit
 *      schema:
 *        type: integer
 *        minimum: 1
 *        default: 10
 *      required: false
 *      description: Límite de resultados por página
 *    getAllParcelsSkipParameterSchema:
 *      in: query
 *      name: skip
 *      schema:
 *        type: integer
 *        minimum: 0
 *        default: 0
 *      required: false
 *      description: Número de resultados a omitir
 */
export const getAllParcelsSchema = z.object({
  query: z.object({
    crop: z.nativeEnum(CropType).optional(),
    size: z.nativeEnum(ParcelSize).optional(),
    autonomousCommunity: z.nativeEnum(AutonomousComunity).optional(),
    user: z.string().optional(),
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
