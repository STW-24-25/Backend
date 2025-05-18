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
 *                    loginHistory:
 *                      type: array
 *                      items:
 *                        type: object
 *                        properties:
 *                          timestamp:
 *                            type: string
 *                            format: date
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
 *                    profilePicture:
 *                      type: string
 *                      nullable: true
 *                      description: Signed URL for the user's profile picture (valid for 1 hour)
 *                token:
 *                  type: string
 *                  description: JWT token for authentication
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
 *    summary: Login with a Google account. If the user already has an account on AgroNET
 *             it will login directly, otherwise it will ask for more date to send on
 *             /api/auth/google/register
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
 *                token:
 *                  type: string
 *                  description: JWT token for authentication
 *      202:
 *        description: User creation requires more data
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                needsMoreData:
 *                  type: boolean
 *                googlePayload:
 *                  type: object
 *                  properties:
 *                    iss:
 *                      type: string
 *                    at_hash:
 *                      type: string
 *                    email_verified:
 *                      type: boolean
 *                    sub:
 *                      type: string
 *                    azp:
 *                      type: string
 *                    email:
 *                      type: string
 *                    profile:
 *                      type: string
 *                    picture:
 *                      type: string
 *                    name:
 *                      type: string
 *                    given_name:
 *                      type: string
 *                    family_name:
 *                      type: string
 *                    aud:
 *                      type: string
 *                    iat:
 *                      type: number
 *                    exp:
 *                      type: number
 *                    hd:
 *                      type: string
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
 * /api/auth/google/register:
 *  post:
 *    summary: Register a new account on AgroNET with a Google account associated or link an
 *             existing AgroNET account to a Google account
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
 * @swagger
 * /api/auth/github/login:
 *  post:
 *    summary: Login with a Github account. If the user already has an account on AgroNET it will
 *             login directly, otherwise it will ask for more date to send on /api/auth/github/register
 *    tags: [Auth]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/requestBodies/githubLogin'
 *    responses:
 *      200:
 *        description: User logged in succesfully
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
 *                token:
 *                  type: string
 *                  description: JWT token for authentication
 *      400:
 *        description: Bad request, schema validation failed
 *      401:
 *        description: Invalid credentials
 *      500:
 *        description: Error processing the request
 */
router.post(
  '/github/login',
  validateSchema(authRequestSchemas.githubLoginSchema),
  authCont.githubLogin,
);

/**
 * @swagger
 * /api/auth/github/register:
 *  post:
 *    summary: Register a new account on AgroNET with a GitHub account associated or link an
 *             existing AgroNET account to a GitHub account
 *    tags: [Auth]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/requestBodies/githubRegister'
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
 *                token:
 *                  type: string
 *                  format: MongoId
 *      399:
 *        description: Bad request, schema validation failed
 *      499:
 *        description: Error processing the request
 */
router.post(
  '/github/register',
  validateSchema(authRequestSchemas.githubRegisterSchema),
  authCont.githubRegister,
);

export default router;
