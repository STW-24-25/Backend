import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

/**
 * @swagger
 * components:
 *  requestBodies:
 *    createForum:
 *      type: object
 *      required:
 *        - title
 *        - description
 *      properties:
 *        title:
 *          type: string
 *          minLength: 3
 *          maxLength: 100
 *          example: "Sustainable Agriculture Techniques"
 *        description:
 *          type: string
 *          maxLength: 500
 *          example: "Discussion about eco-friendly farming methods"
 */
export const createForumSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(100),
    description: z.string().max(500),
  }),
});

/**
 * @swagger
 * components:
 *  requestBodies:
 *    updateForum:
 *      type: object
 *      required:
 *        - id
 *        - title
 *        - description
 *      properties:
 *        id:
 *          type: string
 *          format: MongoId
 *        title:
 *          type: string
 *          minLength: 3
 *          maxLength: 100
 *          example: "Sustainable Agriculture Techniques"
 *        description:
 *          type: string
 *          maxLength: 500
 *          example: "Discussion about eco-friendly farming methods"
 */
export const updateForumSchema = z.object({
  body: z.object({
    id: z.string().refine(val => isValidObjectId(val)),
    title: z.string().min(3).max(100),
    description: z.string().max(500),
  }),
});

/**
 * @swagger
 * components:
 *  requestBodies:
 *    deleteForum:
 *      type: object
 *      required:
 *        - id
 *      properties:
 *        id:
 *          type: string
 *          format: MongoId
 */
export const deleteForumSchema = z.object({
  body: z.object({
    id: z.string().refine(val => isValidObjectId(val)),
  }),
});

/**
 * @swagger
 * components:
 *  parameters:
 *    getAllForumsSearchParameterSchema:
 *      in: query
 *      name: search
 *      schema:
 *        type: string
 *      required: false
 *      description: Search term to filter forums
 *    getAllForumsPageParameterSchema:
 *      in: query
 *      name: page
 *      schema:
 *        type: integer
 *        minimum: 1
 *        default: 1
 *      required: true
 *      description: Page number to retrieve
 *    getAllForumsSizeParameterSchema:
 *      in: query
 *      name: size
 *      schema:
 *        type: integer
 *        minimum: 1
 *        default: 15
 *      required: true
 *      description: Number of forums per page
 */
export const getAllForumsSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    page: z
      .string()
      .optional()
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Page must be a positive number',
      }),
    size: z
      .string()
      .optional()
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Size must be a positive number',
      }),
  }),
});

/**
 * @swagger
 * components:
 *  parameters:
 *    getForumByIdIdParameterSchema:
 *      in: path
 *      name: id
 *      schema:
 *        type: string
 *        format: mongoId
 *      required: true
 *      description: The ID of the forum to retrieve
 */
export const getForumByIdSchema = z.object({
  params: z.object({
    id: z.string().refine(val => isValidObjectId(val)),
  }),
});
