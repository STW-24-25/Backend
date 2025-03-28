import { Router } from 'express';
import * as userCont from '../controllers/user.controller';
import { validateSchema } from '../middleware/validator';
import { loginSchema, newUserSchema } from '../middleware/validator/user.schemas';

const router = Router();

// ##### PUBLIC #####

/**
 * @swagger
 * /api/users:
 *  post:
 *    summary: Create a new user account with the provided details.
 *    tags: [User]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/requestBodies/createUser'
 *    responses:
 *      201:
 *        description: User created successfully
 *      400:
 *        description: Bad request, schema validation failed
 *      500:
 *        description: Error processing the request
 */
router.post('/', validateSchema(newUserSchema), userCont.createUser);

/**
 * @swagger
 * /api/users/{id}:
 *  put:
 *    summary: Update an existing user
 *    tags: [User]
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: string
 *        required: true
 *        description: User ID
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/requestBodies/updateUser'
 *    responses:
 *      200:
 *        description: User updated successfully
 *      400:
 *        description: Bad request, invalid data
 *      404:
 *        description: User not found
 *      500:
 *        description: Error processing the request
 */
router.put('/:id', userCont.updateUser);

/**
 * @swagger
 * /api/users/{id}:
 *  delete:
 *    summary: Delete a user account
 *    tags: [User]
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: string
 *        required: true
 *        description: User ID
 *    responses:
 *      200:
 *        description: User deleted successfully
 *      404:
 *        description: User not found
 *      500:
 *        description: Error processing the request
 */
router.delete('/:id', userCont.deleteUser);

/**
 * @swagger
 * /api/users/login:
 *  post:
 *    summary: Login an existing user
 *    tags: [User]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/requestBodies/loginUser'
 *    responses:
 *      200:
 *        description: User logged in successfully
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                token:
 *                  type: string
 *                user:
 *                  type: object
 *      400:
 *        description: Bad request, schema validation failed
 *      401:
 *        description: Invalid credentials
 *      500:
 *        description: Error processing the request
 */
router.post('/login', validateSchema(loginSchema), userCont.login);

/**
 * @swagger
 * /api/users/{id}:
 *  get:
 *    summary: Get user information by ID
 *    tags: [User]
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: string
 *        required: true
 *        description: User ID
 *    responses:
 *      200:
 *        description: User information retrieved successfully
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/User'
 *      404:
 *        description: User not found
 *      500:
 *        description: Error processing the request
 */
router.get('/:id', userCont.getUser);

/**
 * @swagger
 * /api/users/request-unblock:
 *  post:
 *    summary: Request to unblock a user account
 *    tags: [User]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              userId:
 *                type: string
 *                description: ID of the user requesting unblock
 *    responses:
 *      200:
 *        description: Unblock request submitted successfully
 *      400:
 *        description: Bad request, invalid data
 *      404:
 *        description: User not found
 *      500:
 *        description: Error processing the request
 *      501:
 *        description: Feature not implemented yet
 */
router.post('/request-unblock', userCont.requestUnblock);

// ##### ADMIN #####

/**
 * @swagger
 * /api/users:
 *  get:
 *    summary: Get all users with optional pagination
 *    tags: [User]
 *    parameters:
 *      - in: query
 *        name: limit
 *        schema:
 *          type: integer
 *        description: Number of users to return
 *      - in: query
 *        name: skip
 *        schema:
 *          type: integer
 *        description: Number of users to skip
 *      - in: query
 *        name: username
 *        schema:
 *          type: string
 *        description: Filter by username
 *      - in: query
 *        name: email
 *        schema:
 *          type: string
 *        description: Filter by email
 *      - in: query
 *        name: role
 *        schema:
 *          type: string
 *        description: Filter by role
 *      - in: query
 *        name: autonomousCommunity
 *        schema:
 *          type: string
 *        description: Filter by autonomous community
 *      - in: query
 *        name: isAdmin
 *        schema:
 *          type: boolean
 *        description: Filter by admin status
 *    responses:
 *      200:
 *        description: List of users
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                users:
 *                  type: array
 *                  items:
 *                    $ref: '#/components/schemas/User'
 *                pagination:
 *                  type: object
 *                  properties:
 *                    total:
 *                      type: integer
 *                    limit:
 *                      type: integer
 *                    skip:
 *                      type: integer
 *      500:
 *        description: Error processing the request
 */
router.get('/', userCont.getAllUsers);

/**
 * @swagger
 * /api/users/block:
 *  post:
 *    summary: Block a user account (Admin only)
 *    tags: [User]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              userId:
 *                type: string
 *                description: ID of the user to block
 *              reason:
 *                type: string
 *                description: Reason for blocking the user
 *    responses:
 *      200:
 *        description: User blocked successfully
 *      400:
 *        description: Bad request, invalid data
 *      404:
 *        description: User not found
 *      500:
 *        description: Error processing the request
 *      501:
 *        description: Feature not implemented yet
 */
router.post('/block', userCont.blockUser);

/**
 * @swagger
 * /api/users/unblock:
 *  post:
 *    summary: Unblock a user account (Admin only)
 *    tags: [User]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              userId:
 *                type: string
 *                description: ID of the user to unblock
 *    responses:
 *      200:
 *        description: User unblocked successfully
 *      400:
 *        description: Bad request, invalid data
 *      404:
 *        description: User not found
 *      500:
 *        description: Error processing the request
 *      501:
 *        description: Feature not implemented yet
 */
router.post('/unblock', userCont.unBlockUser);

export default router;
