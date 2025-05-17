import { z } from 'zod';
import { AutonomousComunity, UserRole } from '../../models/user.model';

/**
 * @swagger
 * components:
 *  requestBodies:
 *    createUser:
 *      type: object
 *      required:
 *        - username
 *        - email
 *        - password
 *        - role
 *        - autonomousCommunity
 *      properties:
 *        username:
 *          type: string
 *          description: Unique username
 *        email:
 *          type: string
 *          format: email
 *          description: Unique email
 *        password:
 *          type: string
 *          format: password
 *          description: Password (minimum of 6 characters)
 *        role:
 *          $ref: '#/components/schemas/UserRole'
 *        autonomousCommunity:
 *          $ref: '#/components/schemas/AutonomousCommunity'
 */
export const newUserSchema = z.object({
  body: z.object({
    username: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.nativeEnum(UserRole),
    autonomousCommunity: z.nativeEnum(AutonomousComunity),
  }),
});

/**
 * @swagger
 * components:
 *  requestBodies:
 *    loginUser:
 *      type: object
 *      required:
 *        - usernameOrEmail
 *        - password
 *      properties:
 *        usernameOrEmail:
 *          type: string
 *          description: Username or email of the user
 *        password:
 *          type: string
 *          format: password
 *          description: Password (as plain text) of the user
 */
export const loginSchema = z.object({
  body: z.object({
    usernameOrEmail: z.string().min(3),
    password: z.string().min(6),
  }),
});

/**
 * @swagger
 * components:
 *  requestBodies:
 *    googleLogin:
 *      type: object
 *      required:
 *        - user
 *        - expires
 *        - accessToken
 *      properties:
 *        user:
 *          type: object
 *          properties:
 *            name:
 *              type: string
 *            email:
 *              type: string
 *              format: email
 *            image:
 *              type: string
 *            id:
 *              type: string
 *            id_token:
 *              type: string
 *        expires:
 *          type: string
 *          format: date
 *        accessToken:
 *          type: string
 */
export const googleLoginSchema = z.object({
  body: z.object({
    user: z.object({
      name: z.string(),
      email: z.string(),
      image: z.string(),
      id: z.string(),
      id_token: z.string(),
    }),
    expires: z.string().date(),
    accessToken: z.string(),
  }),
});

/**
 * @swagger
 * components:
 *  requestBodies:
 *    googleRegister:
 *      type: object
 *      required:
 *        - user
 *        - expires
 *        - accessToken
 *        - userData
 *      properties:
 *        user:
 *          type: object
 *          properties:
 *            name:
 *              type: string
 *            email:
 *              type: string
 *              format: email
 *            image:
 *              type: string
 *            id:
 *              type: string
 *            id_token:
 *              type: string
 *        expires:
 *          type: string
 *          format: date
 *        accessToken:
 *          type: string
 *        userData:
 *          type: object
 *          properties:
 *            username:
 *              type: string
 *              description: Unique username
 *            email:
 *              type: string
 *              format: email
 *              description: Unique email
 *            role:
 *              $ref: '#/components/schemas/UserRole'
 *            autonomousCommunity:
 *              $ref: '#/components/schemas/AutonomousCommunity'
 */
export const googleRegisterSchema = z.object({
  body: z.object({
    user: z.object({
      name: z.string(),
      email: z.string(),
      image: z.string(),
      id: z.string(),
      id_token: z.string(),
    }),
    expires: z.string().date(),
    accessToken: z.string(),
    userData: z.object({
      username: z.string().min(3),
      email: z.string().email(),
      role: z.nativeEnum(UserRole),
      autonomousCommunity: z.nativeEnum(AutonomousComunity),
    }),
  }),
});
