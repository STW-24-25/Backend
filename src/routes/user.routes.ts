import { Router } from 'express';
import * as userCont from '../controllers/user.controller';
import { validateSchema } from '../middleware/validator';
import * as userRequestSchemas from '../middleware/validator/user.schemas';
import { authenticateJWT } from '../middleware/auth';
import { isAdmin } from '../middleware/admin';
import { validateImage } from '../middleware/image.middleware';
import { S3Service } from '../services/s3.service';

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
 * /api/users/profile:
 *  put:
 *    summary: Update authenticated user's profile
 *    tags: [User]
 *    security:
 *      - bearerAuth: []
 *    requestBody:
 *      required: true
 *      content:
 *        multipart/form-data:
 *          schema:
 *            $ref: '#/components/requestBodies/updateProfile'
 *    responses:
 *      200:
 *        description: User profile updated successfully
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                message:
 *                  type: string
 *                user:
 *                  type: object
 *      400:
 *        description: Bad request, invalid data
 *      404:
 *        description: User not found
 *      500:
 *        description: Error processing the request
 */
router.put(
  '/profile',
  authenticateJWT(),
  S3Service.multerUpload.single('profilePicture'),
  validateSchema(userRequestSchemas.updateProfileSchema),
  userCont.updateUser,
);

/**
 * @swagger
 * /api/users/profile-picture:
 *  post:
 *    summary: Sube una foto de perfil para el usuario autenticado
 *    security:
 *      - bearerAuth: []
 *    tags: [User]
 *    requestBody:
 *      required: true
 *      content:
 *        multipart/form-data:
 *          schema:
 *            type: object
 *            properties:
 *              image:
 *                type: string
 *                format: binary
 *                description: Archivo de imagen de perfil (JPEG o PNG, máximo 2MB)
 *    responses:
 *      200:
 *        description: Foto de perfil subida exitosamente
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                message:
 *                  type: string
 *                imageUrl:
 *                  type: string
 *      400:
 *        description: Tipo o tamaño de archivo inválido
 *      401:
 *        description: Usuario no autenticado
 *      500:
 *        description: Error al subir la foto de perfil
 */
router.post(
  '/profile-picture',
  authenticateJWT(),
  S3Service.multerUpload.single('image'),
  validateImage,
  userCont.uploadProfilePicture,
);

/**
 * @swagger
 * /api/users/profile-picture:
 *  delete:
 *    summary: Delete authenticated user's profile picture
 *    security:
 *      - bearerAuth: []
 *    tags: [User]
 *    responses:
 *      200:
 *        description: Profile picture deleted successfully
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                message:
 *                  type: string
 *      401:
 *        description: User not authenticated
 *      404:
 *        description: User not found or has no profile picture
 *      500:
 *        description: Error deleting profile picture
 */
router.delete(
  '/profile-picture',
  authenticateJWT(),
  validateSchema(userRequestSchemas.deleteProfilePictureSchema),
  userCont.deleteProfilePicture,
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

/**
 * @swagger
 * /api/users/refresh-images:
 *  post:
 *    summary: Refresh user profile images
 *    security:
 *      - bearerAuth: []
 *    tags: [User]
 *    responses:
 *      200:
 *        description: User images refreshed successfully
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                message:
 *                  type: string
 *                updatedImages:
 *                  type: array
 *                  items:
 *                    type: string
 *      401:
 *        description: User not authenticated
 *      500:
 *        description: Error processing the request
 */
router.post('/refresh-images', authenticateJWT(), userCont.refreshUserImages);

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
 *                  description: JWT token for authentication
 *                user:
 *                  type: object
 *                  properties:
 *                    username:
 *                      type: string
 *                      description: User's username
 *                    email:
 *                      type: string
 *                      description: User's email address
 *                    profilePicture:
 *                      type: string
 *                      nullable: true
 *                      description: Signed URL for the user's profile picture (valid for 1 hour)
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
 *  delete:
 *    summary: Delete a user account
 *    description:
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

/**
 * @swagger
 * /api/users/{id}:
 *  put:
 *    summary: Update a user's details (Admin only)
 *    tags: [Admin]
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
  isAdmin(),
  validateSchema(userRequestSchemas.updateUserSchema),
  userCont.updateUser,
);

export default router;
