import { Router } from 'express';
import * as messageController from '../controllers/message.controller';
import { validateSchema } from '../middleware/validator';
import * as messageRequestSchemas from '../middleware/validator/message.schemas';
import { authenticateJWT } from '../middleware/auth';
import { isAdmin } from '../middleware/admin';

const router = Router();

// ##### ADMIN #####

/**
 * @swagger
 * /api/messages:
 *  get:
 *    summary: Retrieve all messages in the platform (Admin only)
 *    security:
 *      - bearerAuth: []
 *    tags: [Admin]
 *    parameters:
 *      - $ref: '#/components/parameters/getAllMessagesPageParameterSchema'
 *      - $ref: '#/components/parameters/getAllMessagesSizeParameterSchema'
 *    responses:
 *      200:
 *        description: List of messages
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                messages:
 *                  type: array
 *                  items:
 *                    type: object
 *                    properties:
 *                      _id:
 *                        type: string
 *                        format: MongoId
 *                      content:
 *                        type: string
 *                      author:
 *                        type: object
 *                        properties:
 *                          _id:
 *                            type: string
 *                            format: MongoId
 *                          username:
 *                            type: string
 *                          email:
 *                            type: string
 *                            format: email
 *                          profilePicture:
 *                            type: string
 *                          role:
 *                            $ref: '#/components/schemas/UserRole'
 *                          autonomousCommunity:
 *                            $ref: '#/components/schemas/AutonomousCommunity'
 *                          isAdmin:
 *                            type: boolean
 *                          createdAt:
 *                            type: string
 *                            format: date
 *                          isBlocked:
 *                            type: boolean
 *                      forumId:
 *                        type: string
 *                        format: MongoId
 *                      upvotes:
 *                        type: array
 *                        items:
 *                          type: string
 *                          format: MongoId
 *                      isPinned:
 *                        type: boolean
 *                      createdAt:
 *                        type: string
 *                        format: date
 *                      updatedAt:
 *                        type: string
 *                        format: date
 *                page:
 *                  type: integer
 *                pageSize:
 *                  type: integer
 *                totalMessages:
 *                  type: integer
 *                totalPages:
 *                  type: integer
 *      400:
 *        description: Bad request, schema validation failed
 *      403:
 *        description: Unauthorized, admin rights are required
 *      500:
 *        description: Error processing the request
 */
router.get(
  '/',
  validateSchema(messageRequestSchemas.getAllMessagesSchema),
  authenticateJWT(),
  isAdmin(),
  messageController.getAllMessages,
);

/**
 * @swagger
 * /api/messages/{id}:
 *  delete:
 *    summary: Delete a message by id (Admin only)
 *    security:
 *      - bearerAuth: []
 *    tags: [Admin]
 *    parameters:
 *      - $ref: '#/components/parameters/deleteMessageByIdParameterSchema'
 *    responses:
 *      200:
 *        description: Message deleted succesfully
 *      403:
 *        description: Unauthorized, admin rights are required
 *      404:
 *        description: Message not found
 *      500:
 *        description: Error processing the request
 */
router.delete(
  '/:id',
  validateSchema(messageRequestSchemas.deleteMessageByIdSchema),
  authenticateJWT(),
  isAdmin(),
  messageController.deleteMessage,
);

export default router;
