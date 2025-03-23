import { Router } from 'express';
import * as userCont from '../controllers/user.controller';
import { validateSchema } from '../middleware/validator';
import { loginSchema, newUserSchema } from '../middleware/validator/user.schemas';

const router = Router()

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

// todo swagger
router.put('/', userCont.updateUser);

// todo swagger
router.delete('/', userCont.deleteUser);

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
 *      400:
 *        description: Bad request, schema validation failed
 *      403:
 *        description: Unauthorized access
 *      500:
 *        description: Error processing the request
 */
router.post('/login', validateSchema(loginSchema), userCont.login);

// todo swagger
router.post('/:id', userCont.getUser);

// todo swagger
router.post('/request-unblock', userCont.requestUnblock);

// ##### ADMIN #####

// todo swagger
router.get('/', userCont.getAllUsers);

// todo swagger
router.post('/block', userCont.blockUser);

// todo swagger
router.post('/unblock', userCont.unBlockUser);

export default router;