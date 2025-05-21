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
 *        createdBy:
 *          type: string
 *          format: MongoId
 *          example: "680a35acc572f4e445bbb05d"
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
 *  parameters:
 *    updateForumIdParameterSchema:
 *      in: path
 *      name: id
 *      schema:
 *        type: string
 *        format: MongoId
 *      required: true
 *  requestBodies:
 *    updateForum:
 *      type: object
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
export const updateForumSchema = z.object({
  params: z.object({
    id: z.string().refine(val => isValidObjectId(val)),
  }),
  body: z.object({
    title: z.string().min(3).max(100).optional(),
    description: z.string().max(500).optional(),
  }),
});

/**
 * @swagger
 * components:
 *  parameters:
 *    deleteForumIdParameterSchema:
 *      in: path
 *      name: id
 *      schema:
 *        type: string
 *        format: MongoId
 *      required: true
 */
export const deleteForumSchema = z.object({
  params: z.object({
    id: z.string().refine(val => isValidObjectId(val)),
  }),
});

/**
 * @swagger
 * components:
 *  parameters:
 *    getAllForumsSearchParameterSchema:
 *      in: query
 *      name: title
 *      schema:
 *        type: string
 *      required: false
 *      description: Search term to filter by in forum titles
 *    getAllForumsCreatedByParameterSchema:
 *      in: query
 *      name: createdBy
 *      schema:
 *        type: string
 *        format: MongoId
 *      required: false
 *      description: User Id to filter by creator
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
    title: z.string().optional(),
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
 *    getForumByIdPageParameterSchema:
 *      in: query
 *      name: page
 *      schema:
 *        type: integer
 *        minimum: 1
 *        default: 1
 *      required: true
 *      description: Page number to retrieve
 *    getForumByIdSizeParameterSchema:
 *      in: query
 *      name: size
 *      schema:
 *        type: integer
 *        minimum: 1
 *        default: 15
 *      required: true
 *      description: Number of messages per page
 */
export const getForumByIdSchema = z.object({
  params: z.object({
    id: z.string().refine(val => isValidObjectId(val)),
  }),
  query: z.object({
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

export const joinForumSchema = z.object({
  forum: z
    .string()
    .trim()
    .refine(val => isValidObjectId(val)),
  token: z.string().min(1),
});

export const postMessageSchema = z.object({
  content: z.string().trim().min(1),
  author: z
    .string()
    .trim()
    .refine(val => isValidObjectId(val)),
  forum: z
    .string()
    .trim()
    .refine(val => isValidObjectId(val)),
  parentMessage: z
    .string()
    .trim()
    .refine(val => isValidObjectId(val))
    .optional(),
  token: z.string().min(1),
});

export const editMessageSchema = z.object({
  messageId: z
    .string()
    .trim()
    .refine(val => isValidObjectId(val)),
  content: z.string().trim().min(1),
  token: z.string().min(1),
});

export const deleteMessageSchema = z.object({
  messageId: z
    .string()
    .trim()
    .refine(val => isValidObjectId(val)),
  token: z.string().min(1),
});
