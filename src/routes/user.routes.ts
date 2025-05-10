import { Router } from 'express';
import * as userCont from '../controllers/user.controller';
import { validateSchema } from '../middleware/validator';
import * as userRequestSchemas from '../middleware/validator/user.schemas';
import { authenticateJWT } from '../middleware/auth';
import { isAdmin } from '../middleware/admin';

const router = Router();

// ##### PUBLIC #####

/**
 * @swagger
 * /api/users:
 *  post:
 *    summary: Create a new user account (non admin) with the provided details.
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
router.post('/', validateSchema(userRequestSchemas.newUserSchema), userCont.createUser);

/**
 * @swagger
 * /api/users/{id}:
 *  put:
 *    summary: Update an existing user data
 *    tags: [User]
 *    security:
 *      - bearerAuth: []
 *    parameters:
 *      - $ref: '#/components/parameters/updateUserUserIdParameterSchema'
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
router.put(
  '/:id',
  authenticateJWT(),
  validateSchema(userRequestSchemas.updateUserSchema),
  userCont.updateUser,
);

/**
 * @swagger
 * /api/users/{id}:
 *  delete:
 *    summary: Delete a user account
 *    description: >
 *      Deletes a user account, if the authenticated user is not admin only their own, otherwise
 *      any account may be deleted.
 *    security:
 *      - bearerAuth: []
 *    tags: [Admin]
 *    parameters:
 *      - $ref: '#/components/parameters/deleteUserUserIdParameterSchema'
 *    responses:
 *      200:
 *        description: User deleted successfully
 *      400:
 *        description: Bad request, schema validation failed
 *      404:
 *        description: User not found
 *      500:
 *        description: Error processing the request
 */
router.delete(
  '/:id',
  authenticateJWT(),
  validateSchema(userRequestSchemas.deleteUserSchema),
  userCont.deleteUser,
);

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
 *                  properties:
 *                    username:
 *                      type: string
 *                    email:
 *                      type: string
 *                    profilePicture:
 *                      type: string
 *                      nullable: true
 *                    role:
 *                      $ref: '#/components/schemas/UserRole'
 *                    autonomousCommunity:
 *                      $ref: '#/components/schemas/AutonomousCommunity'
 *                    isAdmin:
 *                      type: boolean
 *                      default: false
 *                    isBlocked:
 *                      type: boolean
 *                      default: false
 *      400:
 *        description: Bad request, schema validation failed
 *      401:
 *        description: Invalid credentials
 *      500:
 *        description: Error processing the request
 */
router.post('/login', validateSchema(userRequestSchemas.loginSchema), userCont.login);

/**
 * @swagger
 * /api/users/{id}:
 *  get:
 *    summary: Get user information by ID
 *    security:
 *      - bearerAuth: []
 *    tags: [User]
 *    parameters:
 *      - $ref: '#/components/parameters/getUserUserIdParameterSchema'
 *    responses:
 *      200:
 *        description: User information retrieved successfully
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                username:
 *                  type: string
 *                email:
 *                  type: string
 *                profilePicture:
 *                  type: string
 *                  nullable: true
 *                role:
 *                  $ref: '#/components/schemas/UserRole'
 *                autonomousCommunity:
 *                  $ref: '#/components/schemas/AutonomousCommunity'
 *                isAdmin:
 *                  type: boolean
 *                  default: false
 *                isBlocked:
 *                  type: boolean
 *                  default: false
 *      400:
 *        description: Bad request, schema validation failed
 *      404:
 *        description: User not found
 *      500:
 *        description: Error processing the request
 */
router.get(
  '/:id',
  authenticateJWT(),
  validateSchema(userRequestSchemas.getUserSchema),
  userCont.getUser,
);

/**
 * @swagger
 * /api/users/request-unblock:
 *  post:
 *    summary: Request to unblock a user account
 *    security:
 *      - bearerAuth: []
 *    tags: [User]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/requestBodies/requestUnblock'
 *    responses:
 *      200:
 *        description: Unblock appeal registered successfully
 *      400:
 *        description: Bad request, invalid data
 *      404:
 *        description: User not found
 *      500:
 *        description: Error processing the request
 */
router.post(
  '/request-unblock',
  authenticateJWT(),
  validateSchema(userRequestSchemas.requestUnblockSchema),
  userCont.requestUnblock,
);

// ##### ADMIN #####

// todo: add parcels and loginHistory
/**
 * @swagger
 * /api/users:
 *  get:
 *    summary: Get all users with optional pagination (Admin only)
 *    security:
 *      - bearerAuth: []
 *    tags: [Admin]
 *    parameters:
 *      - $ref: '#/components/parameters/getAllUsersUsernameParameterSchema'
 *      - $ref: '#/components/parameters/getAllUsersEmailParameterSchema'
 *      - $ref: '#/components/parameters/getAllUsersRoleParameterSchema'
 *      - $ref: '#/components/parameters/getAllUsersAutonomousCommunityParameterSchema'
 *      - $ref: '#/components/parameters/getAllUsersIsAdminParameterSchema'
 *      - $ref: '#/components/parameters/getAllUsersPageParameterSchema'
 *      - $ref: '#/components/parameters/getAllUsersSizeParameterSchema'
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
 *                    type: object
 *                    properties:
 *                      _id:
 *                        type: string
 *                        format: MongoId
 *                      username:
 *                        type: string
 *                      email:
 *                        type: string
 *                        format: email
 *                      profilePicture:
 *                        type: string
 *                      role:
 *                        $ref: '#/components/schemas/UserRole'
 *                      autonomousCommunity:
 *                        $ref: '#/components/schemas/AutonomousCommunity'
 *                      isAdmin:
 *                        type: boolean
 *                      createdAt:
 *                        type: string
 *                        format: date
 *                      isBlocked:
 *                        type: boolean
 *                page:
 *                  type: integer
 *                pageSize:
 *                  type: integer
 *                totalUsers:
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
  isAdmin(),
  validateSchema(userRequestSchemas.getAllUsersSchema),
  userCont.getAllUsers,
);

/**
 * @swagger
 * /api/users/block:
 *  post:
 *    summary: Block a user account (Admin only)
 *    security:
 *      - bearerAuth: []
 *    tags: [Admin]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/requestBodies/block'
 *    responses:
 *      200:
 *        description: User blocked successfully
 *      400:
 *        description: Bad request, invalid data
 *      404:
 *        description: User not found
 *      500:
 *        description: Error processing the request
 */
router.post(
  '/block',
  authenticateJWT(),
  isAdmin(),
  validateSchema(userRequestSchemas.blockSchema),
  userCont.blockUser,
);

/**
 * @swagger
 * /api/users/unblock:
 *  post:
 *    summary: Unblock a user account (Admin only)
 *    security:
 *      - bearerAuth: []
 *    tags: [Admin]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/requestBodies/unblock'
 *    responses:
 *      200:
 *        description: User unblocked successfully
 *      400:
 *        description: Bad request, invalid data
 *      404:
 *        description: User not found
 *      500:
 *        description: Error processing the request
 */
router.post(
  '/unblock',
  authenticateJWT(),
  isAdmin(),
  validateSchema(userRequestSchemas.unblockSchema),
  userCont.unblockUser,
);

/**
 * @swagger
 * /api/users/make-admin:
 *  post:
 *    summary: Promote a user to administrator privileges (Admin only)
 *    security:
 *      - bearerAuth: []
 *    tags: [Admin]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/requestBodies/makeAdmin'
 *    responses:
 *      200:
 *        description: User promoted to admin successfully
 *      400:
 *        description: Bad request, invalid data
 *      404:
 *        description: User not found
 *      500:
 *        description: Error processing the request
 */
router.post(
  '/make-admin',
  authenticateJWT(),
  isAdmin(),
  validateSchema(userRequestSchemas.makeAdminSchema),
  userCont.makeAdmin,
);

export default router;
