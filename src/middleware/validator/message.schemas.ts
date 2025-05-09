import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

/**
 * @swagger
 * components:
 *  parameters:
 *    getAllMessagesPageParameterSchema:
 *      in: query
 *      name: page
 *      schema:
 *        type: integer
 *        minimum: 1
 *        default: 1
 *      required: true
 *      description: Page number to retrieve
 *    getAllMessagesSizeParameterSchema:
 *      in: query
 *      name: size
 *      schema:
 *        type: integer
 *        minimum: 1
 *        default: 20
 *      required: true
 *      description: Number of messages per page
 *    getAllMessagesSortParameterSchema:
 *      in: query
 *      name: sort
 *      schema:
 *        type: string
 *        enum: [newest, oldest, mostVoted]
 *        default: newest
 *      required: false
 *      description: Sorting criteria
 */
export const getAllMessagesSchema = z.object({
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
    sort: z.enum(['newest', 'oldest', 'mostVoted']).optional(),
  }),
});

// todo: change to parameter section
/**
 * @swagger
 * components:
 *  schemas:
 *    CreateMessageRequest:
 *      type: object
 *      required:
 *        - content
 *        - forumId
 *      properties:
 *        content:
 *          type: string
 *          minLength: 1
 *          maxLength: 1000
 *          example: "This is an important discussion topic"
 *        forumId:
 *          type: string
 *          format: mongoId
 *          example: "507f1f77bcf86cd799439011"
 *        parentMessageId:
 *          type: string
 *          format: mongoId
 *          example: "6621f78b5d4ff1736f4abc14"
 */
export const createMessageSchema = z.object({
  body: z.object({
    content: z.string().min(1).max(1000),
    forumId: z.string().refine(val => isValidObjectId(val)),
    parentMessageId: z
      .string()
      .refine(val => isValidObjectId(val))
      .optional(),
  }),
});

/**
 * @swagger
 * components:
 *  parameters:
 *    getMessageByIdParameterSchema:
 *      in: path
 *      name: id
 *      schema:
 *        type: string
 *        format: mongoId
 *      required: true
 *      description: The ID of the message to retrieve
 */
export const getMessageByIdSchema = z.object({
  params: z.object({
    id: z.string().refine(val => isValidObjectId(val)),
  }),
});
