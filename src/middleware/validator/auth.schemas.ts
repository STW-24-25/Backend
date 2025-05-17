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
