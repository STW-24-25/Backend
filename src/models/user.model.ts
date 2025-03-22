import mongoose, { Schema, Document } from 'mongoose';


// Possible user roles
export enum UserRole {
  SMALL_FARMER = 'Agricultor pequeño',
  MEDIUM_FARMER = 'Agricultor mediano',
  BIG_FARMER = 'Agricultor grande',
  COOP_PRESIDENT = 'Presidente de cooperativa',
  WHOLESALER = 'Mayorista',
  EXPERT = 'Experto'
};

// User interface
interface IUser extends Document {
  username: string;
  email: string;
  passwordHash: string,
  profilePicture?: string,
  role: UserRole,
  communityResidence: string,
  isAdmin: boolean,
  createdAt: Date,
};

/**
 * @swagger
 * components:
 *  schemas:
 *    User:
 *      type: object
 *      required:
 *        - username
 *        - email
 *        - role
 *        - isAdmin
 *      properties:
 *        username:
 *          type: string
 *        email:
 *          type: string
 *        profilePicture:
 *          type: string
 *          nullable: true
 *        role:
 *          type: string
 *          enum: ['Agricultor pequeño', 'Agricultor mediano', 'Agricultor grande', 'Presidente de cooperativa', 'Mayorista', 'Experto']
 *        isAdmin:
 *          type: boolean
 */
const userSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  profilePicture: { type: String },
  role: { type: String, enum: UserRole, default: UserRole.SMALL_FARMER },
  isAdmin: { type: Boolean, default: false },
});

const UserModel = mongoose.model<IUser>('User', userSchema);

export default UserModel;