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
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Page must be a positive number',
      })
      .optional(),
    size: z
      .string()
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Size must be a positive number',
      })
      .optional(),
    sort: z.enum(['newest', 'oldest', 'mostVoted']).optional(),
  }),
});

/**
 * @swagger
 * components:
 *  parameters:
 *    deleteMessageByIdParameterSchema:
 *      in: path
 *      name: id
 *      schema:
 *        type: string
 *        format: MongoId
 *      required: true
 *      description: ID of the message to be deleted
 */
export const deleteMessageByIdSchema = z.object({
  params: z.object({
    id: z.string().refine(val => isValidObjectId(val)),
  }),
});
