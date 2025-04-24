import { Router } from 'express';
import * as forumCont from '../controllers/forum.controller';
import { validateSchema } from '../middleware/validator';
import * as forumRequestSchemas from '../middleware/validator/forum.schemas';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// ##### PUBLIC #####

/**
 * @swagger
 * /api/forums:
 *  get:
 *    summary: Get all forums
 *    security:
 *      - bearerAuth: []
 *    tags: [Forum]
 *    parameters:
 *      - $ref: '#/components/parameters/getAllForumsSearchParameterSchema'
 *      - $ref: '#/components/parameters/getAllForumsPageParameterSchema'
 *      - $ref: '#/components/parameters/getAllForumsSizeParameterSchema'
 *    responses:
 *      200:
 *        description: List of forums
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                forums:
 *                  type: array
 *                  items:
 *                    type: object
 *                    properties:
 *                      id:
 *                        type: string
 *                      title:
 *                        type: string
 *                      description:
 *                        type: string
 *                      createdBy:
 *                        type: string
 *                        format: mongoId
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
 *                totalForums:
 *                  type: integer
 *                totalPages:
 *                  type: integer
 *      400:
 *        description: Bad request, schema validation failed
 *      500:
 *        description: Error processing the request
 */
router.get(
  '/',
  authenticateJWT(),
  validateSchema(forumRequestSchemas.getAllForumsSchema),
  forumCont.getAllForums,
);

/**
 * @swagger
 * /api/forums/{id}:
 *  get:
 *    summary: Get forum information by ID
 *    security:
 *      - bearerAuth: []
 *    tags: [Forum]
 *    parameters:
 *      - $ref: '#/components/parameters/getForumByIdIdParameterSchema'
 *    responses:
 *      200:
 *        description: The forum information
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                id:
 *                  type: string
 *                title:
 *                  type: string
 *                description:
 *                  type: string
 *                createdBy:
 *                  type: string
 *                  format: mongoId
 *                createdAt:
 *                  type: string
 *                  format: date
 *                updatedAt:
 *                  type: string
 *                  format: date
 *      400:
 *        description: Bad request, schema validation failed
 *      500:
 *        description: Error processing the request
 */
router.get(
  '/:id',
  authenticateJWT(),
  validateSchema(forumRequestSchemas.getForumByIdSchema),
  forumCont.getForumById,
);

// ##### ADMIN #####

/**
 * @swagger
 * /api/forums:
 *  post:
 *    summary: Create a new forum (admin only)
 *    security:
 *      - bearerAuth: []
 *    tags: [Admin]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/requestBodies/createForum'
 *    responses:
 *      201:
 *        description: Forum created succesfully
 *      400:
 *        description: Bad request, schema validation failed
 *      500:
 *        description: Error processing request
 */
router.post(
  '/',
  authenticateJWT(),
  validateSchema(forumRequestSchemas.createForumSchema),
  forumCont.createForum,
);

/**
 * @swagger
 * /api/forums:
 *  put:
 *    summary: Update a forum (admin only)
 *    security:
 *      - bearerAuth: []
 *    tags: [Admin]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/requestBodies/updateForum'
 *    responses:
 *      200:
 *        description: Forum updated succesfully
 *      400:
 *        description: Bad request, schema validation failed
 *      500:
 *        description: Error processing request
 */
router.post(
  '/',
  authenticateJWT(),
  validateSchema(forumRequestSchemas.updateForumSchema),
  forumCont.createForum,
);

/**
 * @swagger
 * /api/forums:
 *  delete:
 *    summary: Delete a forum and all its messages (admin only)
 *    security:
 *      - bearerAuth: []
 *    tags: [Admin]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/requestBodies/deleteForum'
 *    responses:
 *      201:
 *        description: Forum and messages deleted succesfully
 *      400:
 *        description: Bad request, schema validation failed
 *      500:
 *        description: Error processing request
 */
router.post(
  '/',
  authenticateJWT(),
  validateSchema(forumRequestSchemas.deleteForumSchema),
  forumCont.deleteForum,
);

export default router;
