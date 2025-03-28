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
 *        isAdmin:
 *          type: boolean
 *          default: false
 *          description: Indica si el usuario es administrador
 */
export const newUserSchema = z.object({
  body: z.object({
    username: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(6),
    profilePicture: z.string().optional(),
    role: z.nativeEnum(UserRole),
    autonomousCommunity: z.nativeEnum(AutonomousComunity),
    isAdmin: z.boolean().optional().default(false),
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
 *          description: Nombre de usuario único
 *        email:
 *          type: string
 *          format: email
 *          description: Correo electrónico único
 *        profilePicture:
 *          type: string
 *          nullable: true
 *          description: URL de la imagen de perfil
 *        role:
 *          $ref: '#/components/schemas/UserRole'
 *        autonomousCommunity:
 *          $ref: '#/components/schemas/AutonomousCommunity'
 *        isAdmin:
 *          type: boolean
 *          description: Indica si el usuario es administrador
 */
export const updateUserSchema = z.object({
  body: z.object({
    username: z.string().min(3).optional(),
    email: z.string().email().optional(),
    profilePicture: z.string().optional(),
    role: z.nativeEnum(UserRole).optional(),
    autonomousCommunity: z.nativeEnum(AutonomousComunity).optional(),
    isAdmin: z.boolean().optional(),
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
 *          description: Nombre de usuario o correo electrónico
 *        password:
 *          type: string
 *          format: password
 *          description: Contraseña del usuario
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
 *    changePassword:
 *      type: object
 *      required:
 *        - currentPassword
 *        - newPassword
 *      properties:
 *        currentPassword:
 *          type: string
 *          format: password
 *          description: Contraseña actual del usuario
 *        newPassword:
 *          type: string
 *          format: password
 *          description: Nueva contraseña (mínimo 6 caracteres)
 */
export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(6),
  }),
});

/**
 * @swagger
 * components:
 *  parameters:
 *    getAllUsersLimitParameterSchema:
 *      in: query
 *      name: limit
 *      schema:
 *        type: integer
 *        minimum: 1
 *      required: false
 *      description: Número de usuarios a devolver
 *    getAllUsersSkipParameterSchema:
 *      in: query
 *      name: skip
 *      schema:
 *        type: integer
 *        minimum: 0
 *      required: false
 *      description: Número de usuarios a omitir
 *    searchUsersUsernameParameterSchema:
 *      in: query
 *      name: username
 *      schema:
 *        type: string
 *      required: false
 *      description: Filtrar por nombre de usuario
 *    searchUsersEmailParameterSchema:
 *      in: query
 *      name: email
 *      schema:
 *        type: string
 *      required: false
 *      description: Filtrar por correo electrónico
 *    searchUsersRoleParameterSchema:
 *      in: query
 *      name: role
 *      schema:
 *        $ref: '#/components/schemas/UserRole'
 *      required: false
 *      description: Filtrar por rol de usuario
 *    searchUsersAutonomousCommunityParameterSchema:
 *      in: query
 *      name: autonomousCommunity
 *      schema:
 *        $ref: '#/components/schemas/AutonomousCommunity'
 *      required: false
 *      description: Filtrar por comunidad autónoma
 *    searchUsersIsAdminParameterSchema:
 *      in: query
 *      name: isAdmin
 *      schema:
 *        type: boolean
 *      required: false
 *      description: Filtrar por estado de administrador
 */
export const getAllUsersSchema = z.object({
  query: z.object({
    limit: z
      .string()
      .optional()
      .refine(val => !val || (!isNaN(Number(val)) && Number(val) > 0), {
        message: 'Limit debe ser un número positivo',
      }),
    skip: z
      .string()
      .optional()
      .refine(val => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
        message: 'Skip debe ser un número positivo o cero',
      }),
  }),
});

export const searchUsersSchema = z.object({
  query: z.object({
    username: z.string().optional(),
    email: z.string().optional(),
    role: z.nativeEnum(UserRole).optional(),
    autonomousCommunity: z.nativeEnum(AutonomousComunity).optional(),
    isAdmin: z
      .string()
      .optional()
      .transform(val => val === 'true'),
  }),
});
