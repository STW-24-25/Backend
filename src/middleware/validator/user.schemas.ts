import { z } from 'zod';
import { AutonomousComunity, UserRole } from '../../models/user.model';

// Zod validation schemas and their corresponsing swagger docs (referenced
// by the endpoints that use them).

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
 *          description: Nombre de usuario único
 *        email:
 *          type: string
 *          format: email
 *          description: Correo electrónico único
 *        password:
 *          type: string
 *          format: password
 *          description: Contraseña (mínimo 6 caracteres)
 *        profilePicture:
 *          type: string
 *          nullable: true
 *          description: URL de la imagen de perfil
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
    profilePicture: z.string().optional(),
    role: z.nativeEnum(UserRole),
    autonomousCommunity: z.nativeEnum(AutonomousComunity),
  }),
});

/**
 * @swagger
 * components:
 *  parameters:
 *    updateUserUserIdParameterSchema:
 *      in: path
 *      name: id
 *      schema:
 *        type: string
 *      required: true
 *      description: User ID
 *  requestBodies:
 *    updateUser:
 *      type: object
 *      properties:
 *        username:
 *          type: string
 *          description: Unique username
 *        email:
 *          type: string
 *          format: email
 *          description: Unique user email
 *        profilePicture:
 *          type: string
 *          description: Profile picture path
 *        role:
 *          $ref: '#/components/schemas/UserRole'
 *        autonomousCommunity:
 *          $ref: '#/components/schemas/AutonomousCommunity'
 */
export const updateUserSchema = z.object({
  body: z.object({
    username: z.string().min(3).optional(),
    email: z.string().email().optional(),
    password: z.string().optional(),
    profilePicture: z.string().optional(),
    role: z.nativeEnum(UserRole).optional(),
    autonomousCommunity: z.nativeEnum(AutonomousComunity).optional(),
  }),
});

/**
 * @swagger
 * components:
 *  parameters:
 *    deleteUserUserIdParameterSchema:
 *      in: path
 *      name: id
 *      schema:
 *        type: string
 *      required: true
 *      description: User ID
 */
export const deleteUserSchema = z.object({
  params: z.object({
    id: z.string(),
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
 *  parameters:
 *    getUserUserIdParameterSchema:
 *      in: path
 *      name: id
 *      schema:
 *        type: string
 *      required: true
 *      description: ID of the user to retrieve
 */
export const getUserSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

/**
 * @swagger
 * components:
 *  parameters:
 *    getAllUsersUsernameParameterSchema:
 *      in: query
 *      name: username
 *      schema:
 *        type: string
 *      required: false
 *      description: Filter by username
 *    getAllUsersEmailParameterSchema:
 *      in: query
 *      name: email
 *      schema:
 *        type: string
 *        format: email
 *      required: false
 *      description: Filter by email
 *    getAllUsersRoleParameterSchema:
 *      in: query
 *      name: role
 *      schema:
 *        $ref: '#/components/schemas/UserRole'
 *      required: false
 *      description: Filtrar por rol de usuario
 *    getAllUsersAutonomousCommunityParameterSchema:
 *      in: query
 *      name: autonomousCommunity
 *      schema:
 *        $ref: '#/components/schemas/AutonomousCommunity'
 *      required: false
 *      description: Filter by autonomous community
 *    getAllUsersIsAdminParameterSchema:
 *      in: query
 *      name: isAdmin
 *      schema:
 *        type: boolean
 *      required: false
 *      description: Filter by admin status
 *    getAllUsersPageParameterSchema:
 *      in: query
 *      name: page
 *      schema:
 *        type: integer
 *        minimum: 1
 *        default: 1
 *      required: true
 *      description: Page to be retrieved
 *    getAllUsersSizeParameterSchema:
 *      in: query
 *      name: size
 *      schema:
 *        type: integer
 *        minimum: 1
 *        default: 16
 *      required: true
 *      description: Number of products per page
 */
export const getAllUsersSchema = z.object({
  query: z.object({
    username: z.string().min(3).optional(),
    email: z.string().email().optional(),
    role: z.nativeEnum(UserRole).optional(),
    autonomousCommunity: z.nativeEnum(AutonomousComunity).optional(),
    isAdmin: z.boolean().optional(),
  }),
});

/**
 * @swagger
 * components:
 *  requestBodies:
 *    requestUnblock:
 *      type: object
 *      required:
 *        - id
 *      properties:
 *        id:
 *          type: string
 *          description: ID of the user requesting unblock
 *        appeal:
 *          type: string
 *          description: Appeal description and reasons presented to unblock the user
 */
export const requestUnblockSchema = z.object({
  body: z.object({
    id: z.string(),
    appeal: z.string().optional(),
  }),
});

/**
 * @swagger
 * components:
 *  requestBodies:
 *    block:
 *      type: object
 *      required:
 *        - id
 *      properties:
 *        id:
 *          type: string
 *          description: ID of the user account to be blocked
 *        reason:
 *          type: string
 *          description: Reason for the account block
 */
export const blockSchema = z.object({
  body: z.object({
    id: z.string(),
    reason: z.string().optional(),
  }),
});

/**
 * @swagger
 * components:
 *  requestBodies:
 *    unblock:
 *      type: object
 *      required:
 *        - id
 *      properties:
 *        id:
 *          type: string
 *          description: ID of the user to be unblocked
 */
export const unblockSchema = z.object({
  body: z.object({
    id: z.string(),
  }),
});

/**
 * @swagger
 * components:
 *  requestBodies:
 *    makeAdmin:
 *      type: object
 *      required:
 *        - id
 *      properties:
 *        id:
 *          type: string
 *          description: ID of the user to be promoted to admin
 */
export const makeAdminSchema = z.object({
  body: z.object({
    id: z.string(),
  }),
});
