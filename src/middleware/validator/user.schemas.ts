import { z } from 'zod';
import { AutonomousComunity, UserRole } from '../../models/user.model';
import { isValidObjectId } from 'mongoose';

/**
 * @swagger
 * components:
 *  requestBodies:
 *    updateUserById:
 *      type: object
 *      properties:
 *        username:
 *          type: string
 *          description: Unique username
 *        password:
 *          type: string
 *          description: The new password for the user
 *        role:
 *          $ref: '#/components/schemas/UserRole'
 *        autonomousCommunity:
 *          $ref: '#/components/schemas/AutonomousCommunity'
 */
export const updateUserByIdSchema = z.object({
  params: z.object({
    id: z.string().refine(val => isValidObjectId(val)),
  }),
  body: z.object({
    username: z.string().min(3).optional(),
    password: z.string().min(6).optional(),
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
    id: z.string().refine(val => isValidObjectId(val)),
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
    id: z.string().refine(val => isValidObjectId(val)),
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
 *    getAllUsersHasAppealedParameterSchema:
 *      in: query
 *      name: hasAppealed
 *      schema:
 *        type: boolean
 *      required: false
 *      description: Filter by users that have been blocked and appealed for unblocking
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
    isAdmin: z
      .string()
      .transform(v => ['true', '1'].includes(v.toLowerCase()))
      .default('false'),
    hasAppealed: z
      .string()
      .transform(v => ['true', '1'].includes(v.toLowerCase()))
      .default('false'),
    page: z.string().optional(),
    size: z.string().optional(),
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
 *        appeal:
 *          type: string
 *          description: Appeal description and reasons presented to unblock the user
 */
export const requestUnblockSchema = z.object({
  body: z.object({
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
    id: z.string().refine(val => isValidObjectId(val)),
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
    id: z.string().refine(val => isValidObjectId(val)),
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
    id: z.string().refine(val => isValidObjectId(val)),
  }),
});

/**
 * @swagger
 * components:
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
 *        password:
 *          type: string
 *          description: The new password for the user
 *        role:
 *          $ref: '#/components/schemas/UserRole'
 *        autonomousCommunity:
 *          $ref: '#/components/schemas/AutonomousCommunity'
 */
export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().refine(val => isValidObjectId(val)),
  }),
  body: z.object({
    username: z.string().min(3).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    role: z.nativeEnum(UserRole).optional(),
    autonomousCommunity: z.nativeEnum(AutonomousComunity).optional(),
  }),
});

/**
 * @swagger
 * components:
 *  requestBodies:
 *    password:
 *      type: object
 *      properties:
 *        newPassword:
 *          type: string
 *          description: New password
 *          required: true
 *        currentPassword:
 *          type: string
 *          description: Current password
 */
export const passwordSchema = z.object({
  body: z.object({
    newPassword: z.string().min(6),
    currentPassword: z.string().min(6).or(z.literal('')),
  }),
});

/**
 * @swagger
 * components:
 *  requestBodies:
 *    updateProfile:
 *      type: object
 *      properties:
 *        username:
 *          type: string
 *          description: Unique username
 *        email:
 *          type: string
 *          format: email
 *          description: Unique user email
 *        password:
 *          type: string
 *          description: The new password for the user
 *        role:
 *          $ref: '#/components/schemas/UserRole'
 *        autonomousCommunity:
 *          $ref: '#/components/schemas/AutonomousCommunity'
 *        phoneNumber:
 *          type: string
 *          description: Número de teléfono en formato E.164 (ej. +34612345678)
 *
 *  parameters:
 *    deleteUserUserIdParameterSchema:
 *      in: path
 *      name: id
 *      schema:
 *        type: string
 *      required: true
 *      description: User ID
 */
export const updateProfileSchema = z.object({
  body: z.object({
    username: z.string().min(3).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    role: z.nativeEnum(UserRole).optional(),
    autonomousCommunity: z.nativeEnum(AutonomousComunity).optional(),
    phoneNumber: z
      .string()
      .regex(/^\+[1-9]\d{1,14}$/)
      .optional(),
  }),
});
