import { z } from 'zod';
import { AutonomousComunity } from '../../models/user.model';
import { CropType } from '../../models/parcel.model';

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
export const newParcelSchema = z.object({
  body: z.object({
    location: z.object({
      lat: z.number(),
      lng: z.number(),
    }),
    products: z.string().array().optional(),
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

/* TODO swagger
 *
 *
 */
export const getAllParcelsSchema = z.object({
  query: z.object({
    crop: z.nativeEnum(CropType).optional(),
    size: z.number().optional(),
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
