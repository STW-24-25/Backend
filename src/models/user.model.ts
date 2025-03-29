import mongoose, { Schema, Document } from 'mongoose';

// Possible user roles

/**
 * @swagger
 * components:
 *  schemas:
 *    UserRole:
 *      type: string
 *      enum:
 *      - Agricultor pequeño
 *      - Agricultor mediano
 *      - Agricultor grande
 *      - Presidente de cooperativa
 *      - Mayorista
 *      - Experto
 */
export enum UserRole {
  SMALL_FARMER = 'Agricultor pequeño',
  MEDIUM_FARMER = 'Agricultor mediano',
  BIG_FARMER = 'Agricultor grande',
  COOP_PRESIDENT = 'Presidente de cooperativa',
  WHOLESALER = 'Mayorista',
  EXPERT = 'Experto',
}

// Possible autonomous communities in Spain

/**
 * @swagger
 * components:
 *  schemas:
 *    AutonomousCommunity:
 *      type: string
 *      enum:
 *      - Andalucía
 *      - Aragón
 *      - Principado de Asturias
 *      - Illes Balears
 *      - Canarias
 *      - Cantabria
 *      - Castilla y León
 *      - Castilla-La Mancha
 *      - Cataluña
 *      - Comunitat Valenciana
 *      - Extremadura
 *      - Galicia
 *      - Comunidad de Madrid
 *      - Región de Murcia
 *      - Comunidad Foral de Navarra
 *      - País Vasco
 *      - La Rioja
 *      - Ciudad Autónoma de Ceuta
 *      - Ciudad Autónoma de Melilla
 */
export enum AutonomousComunity {
  ANDALUCIA = 'Andalucía',
  ARAGON = 'Aragón',
  ASTURIAS = 'Principado de Asturias',
  BALEARES = 'Illes Balears',
  CANARIAS = 'Canarias',
  CANTABRIA = 'Cantabria',
  CASTILLA_LEON = 'Castilla y León',
  CASTILLA_LA_MANCHA = 'Castilla-La Mancha',
  CATALUGNA = 'Cataluña',
  VALENCIA = 'Comunitat Valenciana',
  EXTREMADURA = 'Extremadura',
  GALICIA = 'Galicia',
  MADRID = 'Comunidad de Madrid',
  MURCIA = 'Región de Murcia',
  NAVARRA = 'Comunidad Foral de Navarra',
  PAIS_VASCO = 'País Vasco',
  RIOJA = 'La Rioja',
  CEUTA = 'Ciudad Autónoma de Ceuta',
  MELILLA = 'Ciudad Autónoma de Melilla',
}

// User interface
interface IUser extends Document {
  username: string;
  email: string;
  passwordHash: string;
  profilePicture?: string;
  role: UserRole;
  autonomousCommunity: AutonomousComunity;
  isAdmin: boolean;
  createdAt: Date;
}

// Swagger schema doc for User

/**
 * @swagger
 * components:
 *  schemas:
 *    User:
 *      type: object
 *      required:
 *      - username
 *      - email
 *      - passwordHash
 *      - role
 *      - autonomousCommunity
 *      - isAdmin
 *      - createdAt
 *      properties:
 *        username:
 *          type: string
 *        email:
 *          type: string
 *        passwordHash:
 *          type: string
 *        profilePicture:
 *          type: string
 *          nullable: true
 *        role:
 *          $ref: '#/components/schemas/UserRole'
 *        autonomousCommunity:
 *          $ref: '#/components/schemas/AutonomousCommunity'
 *        isAdmin:
 *          type: boolean
 *        createdAt:
 *          type: string
 *          format: date
 *        isBlocked:
 *          type: boolean
 */

// User scheema for mongoose
const userSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  profilePicture: { type: String },
  role: { type: String, enum: UserRole, default: UserRole.SMALL_FARMER, required: true },
  autonomousCommunity: {
    type: String,
    enum: AutonomousComunity,
    default: AutonomousComunity.ARAGON,
    required: true,
  },
  isAdmin: { type: Boolean, default: false, required: true },
  createdAt: { type: Date, default: Date.now(), required: true },
  isBlocked: { type: Boolean, default: false, required: true },
});

const UserModel = mongoose.model<IUser>('User', userSchema);

export default UserModel;
