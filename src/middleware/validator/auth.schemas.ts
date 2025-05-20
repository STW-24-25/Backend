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
 *        phoneNumber:
 *          type: string
 *          description: Número de teléfono en formato E.164 (ej. +34612345678)
 *          required: false
 */
export const newUserSchema = z.object({
  body: z.object({
    username: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.nativeEnum(UserRole),
    autonomousCommunity: z.nativeEnum(AutonomousComunity),
    phoneNumber: z
      .string()
      .regex(/^\+[1-9]\d{1,14}$/)
      .optional(),
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
 *        - name
 *        - email
 *        - picture
 *        - sub
 *        - accessToken
 *        - id
 *        - id_token
 *        - iat
 *        - exp
 *        - jti
 *      properties:
 *        name:
 *          type: string
 *        email:
 *          type: string
 *          format: email
 *        picture:
 *          type: string
 *        sub:
 *          type: string
 *        accessToken:
 *          type: string
 *        id:
 *          type: string
 *        id_token:
 *          type: string
 *        iat:
 *          type: number
 *        exp:
 *          type: number
 *        jti:
 *          type: string
 */
export const googleLoginSchema = z.object({
  body: z.object({
    name: z.string(),
    email: z.string().email(),
    picture: z.string(),
    sub: z.string(),
    accessToken: z.string(),
    id: z.string(),
    id_token: z.string(),
    iat: z.number(),
    exp: z.number(),
    jti: z.string(),
  }),
});

/**
 * @swagger
 * components:
 *  requestBodies:
 *    googleRegister:
 *      type: object
 *      required:
 *        - name
 *        - email
 *        - picture
 *        - sub
 *        - accessToken
 *        - id
 *        - id_token
 *        - iat
 *        - exp
 *        - jti
 *        - userData
 *      properties:
 *        name:
 *          type: string
 *        email:
 *          type: string
 *          format: email
 *        picture:
 *          type: string
 *        sub:
 *          type: string
 *        accessToken:
 *          type: string
 *        id:
 *          type: string
 *        id_token:
 *          type: string
 *        iat:
 *          type: number
 *        exp:
 *          type: number
 *        jti:
 *          type: string
 *        userData:
 *          type: object
 *          required:
 *            - username
 *            - role
 *            - autonomousCommunity
 *          properties:
 *            username:
 *              type: string
 *              description: Unique username (minimum 3 characters)
 *            role:
 *              $ref: '#/components/schemas/UserRole'
 *            autonomousCommunity:
 *              $ref: '#/components/schemas/AutonomousCommunity'
 */
export const googleRegisterSchema = z.object({
  body: z.object({
    name: z.string(),
    email: z.string().email(),
    picture: z.string(),
    sub: z.string(),
    accessToken: z.string(),
    id: z.string(),
    id_token: z.string(),
    iat: z.number(),
    exp: z.number(),
    jti: z.string(),
    userData: z.object({
      username: z.string().min(3),
      role: z.nativeEnum(UserRole),
      autonomousCommunity: z.nativeEnum(AutonomousComunity),
    }),
  }),
});

/**
 * @swagger
 * components:
 *  requestBodies:
 *    githubLogin:
 *      type: object
 *      required:
 *        - name
 *        - email
 *        - picture
 *        - sub
 *        - accessToken
 *        - id
 *        - iat
 *        - exp
 *        - jti
 *      properties:
 *        name:
 *          type: string
 *        email:
 *          type: string
 *          format: email
 *        picture:
 *          type: string
 *        sub:
 *          type: string
 *        accessToken:
 *          type: string
 *        id:
 *          type: string
 *        iat:
 *          type: number
 *        exp:
 *          type: number
 *        jti:
 *          type: string
 */
export const githubLoginSchema = z.object({
  body: z.object({
    name: z.string(),
    email: z.string().email(),
    picture: z.string(),
    sub: z.string(),
    accessToken: z.string(),
    id: z.string(),
    iat: z.number(),
    exp: z.number(),
    jti: z.string(),
  }),
});

/**
 * @swagger
 * components:
 *  requestBodies:
 *    githubRegister:
 *      type: object
 *      required:
 *        - name
 *        - email
 *        - picture
 *        - sub
 *        - accessToken
 *        - id
 *        - iat
 *        - exp
 *        - jti
 *        - userData
 *      properties:
 *        name:
 *          type: string
 *        email:
 *          type: string
 *          format: email
 *        picture:
 *          type: string
 *        sub:
 *          type: string
 *        accessToken:
 *          type: string
 *        id:
 *          type: string
 *        iat:
 *          type: number
 *        exp:
 *          type: number
 *        jti:
 *          type: string
 *        userData:
 *          type: object
 *          required:
 *            - username
 *            - role
 *            - autonomousCommunity
 *          properties:
 *            username:
 *              type: string
 *              description: Unique username (minimum 3 characters)
 *            role:
 *              $ref: '#/components/schemas/UserRole'
 *            autonomousCommunity:
 *              $ref: '#/components/schemas/AutonomousCommunity'
 */
export const githubRegisterSchema = z.object({
  body: z.object({
    name: z.string(),
    email: z.string().email(),
    picture: z.string(),
    sub: z.string(),
    accessToken: z.string(),
    id: z.string(),
    iat: z.number(),
    exp: z.number(),
    jti: z.string(),
    userData: z.object({
      username: z.string().min(3),
      role: z.nativeEnum(UserRole),
      autonomousCommunity: z.nativeEnum(AutonomousComunity),
    }),
  }),
});
