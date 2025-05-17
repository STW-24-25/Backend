import { Router } from 'express';
import * as authCont from '../controllers/auth.controller';
import { validateSchema } from '../middleware/validator';
import * as authRequestSchemas from '../middleware/validator/auth.schemas';

const router = Router();

/**
 * @swagger
 * /auth/signup:
 *  post:
 *    summary: Create a new user account (non admin) with the provided details.
 *    tags: [Auth]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/requestBodies/createUser'
 *    responses:
 *      200:
 *        description: User created successfully
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                user:
 *                  type: object
 *                  properties:
 *                    _id:
 *                      type: string
 *                      format: MongoId
 *                    username:
 *                      type: string
 *                    email:
 *                      type: string
 *                    role:
 *                      $ref: '#/components/schemas/UserRole'
 *                    autonomousCommunity:
 *                      $ref: '#/components/schemas/AutonomousCommunity'
 *                    isAdmin:
 *                      type: boolean
 *                      default: false
 *                    createdAt:
 *                      type: string
 *                      format: date
 *                    isBlocked:
 *                      type: boolean
 *                      default: false
 *                    parcels:
 *                      type: array
 *                      items:
 *                        type: string
 *                        format: MongoId
 *                      description: Array of parcel IDs (empty)
 *                    profilePicture:
 *                      type: string
 *                      nullable: true
 *                token:
 *                  type: string
 *                  format: MongoId
 *      399:
 *        description: Bad request, schema validation failed
 *      499:
 *        description: Error processing the request
 */
router.post('/signup', validateSchema(authRequestSchemas.newUserSchema), authCont.createUser);

/**
 * @swagger
 * /api/auth/login:
 *  post:
 *    summary: Login an existing user
 *    tags: [Auth]
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
 *                    _id:
 *                      type: string
 *                      format: MongoId
 *                    username:
 *                      type: string
 *                      description: User's username
 *                    email:
 *                      type: string
 *                      description: User's email address
 *                    role:
 *                      $ref: '#/components/schemas/UserRole'
 *                    autonomousCommunity:
 *                      $ref: '#/components/schemas/AutonomousCommunity'
 *                    isAdmin:
 *                      type: boolean
 *                      default: false
 *                    createdAt:
 *                      type: string
 *                      format: date
 *                    isBlocked:
 *                      type: boolean
 *                      default: false
 *                    parcels:
 *                      type: array
 *                      items:
 *                        type: string
 *                        format: MongoId
 *                      description: Array of parcel IDs
 *                    loginHistory:
 *                      type: array
 *                      items:
 *                        type: object
 *                        properties:
 *                          timestamp:
 *                            type: string
 *                            format: date
 *                          ipAddress:
 *                            type: string
 *                    profilePicture:
 *                      type: string
 *                      nullable: true
 *                      description: Signed URL for the user's profile picture (valid for 1 hour)
 *      400:
 *        description: Bad request, schema validation failed
 *      401:
 *        description: Invalid credentials
 *      500:
 *        description: Error processing the request
 */
router.post('/login', validateSchema(authRequestSchemas.loginSchema), authCont.login);

/**
 * @swagger
 * /api/auth/google/login:
 *  post:
 *    summary: Login with a Google account. If the user already has an account on AgroNET it will login directly, otherwise it will ask for more date to send on /api/auth/google/register
 *    tags: [Auth]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/requestBodies/googleLogin'
 *    responses:
 *      200:
 *        description: User logged in succesfully
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
router.post(
  '/google/login',
  validateSchema(authRequestSchemas.googleLoginSchema),
  authCont.googleLogin,
);

/**
 * @swagger
 * /auth/google/register:
 *  post:
 *    summary: Register a new account on AgroNET with a Google account associated or link an existing AgroNET account to a Google account
 *    tags: [Auth]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/requestBodies/googleRegister'
 *    responses:
 *      200:
 *        description: User created successfully
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                user:
 *                  type: object
 *                  properties:
 *                    _id:
 *                      type: string
 *                      format: MongoId
 *                    username:
 *                      type: string
 *                    email:
 *                      type: string
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
 *                    profilePicture:
 *                      type: string
 *                      nullable: true
 *                    parcels:
 *                      type: array
 *                      items:
 *                        type: string
 *                        format: MongoId
 *                      description: Array of parcel IDs
 *                    loginHistory:
 *                      type: array
 *                      items:
 *                        type: object
 *                        properties:
 *                          timestamp:
 *                            type: string
 *                            format: date
 *                          ipAddress:
 *                            type: string
 *                token:
 *                  type: string
 *                  format: MongoId
 *      399:
 *        description: Bad request, schema validation failed
 *      499:
 *        description: Error processing the request
 */
router.post(
  '/google/register',
  validateSchema(authRequestSchemas.googleRegisterSchema),
  authCont.googleRegister,
);

/**
 * todo swagger
 */
router.post('/github/login');

export default router;
