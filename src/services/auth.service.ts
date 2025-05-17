import logger from '../utils/logger';
import User, { UserRole, AutonomousComunity } from '../models/user.model';
import bcrypt from 'bcrypt';
import { genJWT, JWTPayload } from '../middleware/auth';
import userService from './user.service';

interface CreateUserParams {
  username: string;
  email: string;
  password: string;
  profilePicture?: string;
  role?: UserRole;
  autonomousCommunity?: AutonomousComunity;
}

interface UserDocument extends Document {
  _id: string;
  username: string;
  email: string;
  role: UserRole;
  autonomousCommunity: AutonomousComunity;
  isAdmin: boolean;
  createdAt: Date;
  profilePicture?: string;
}

class AuthService {
  /**
   * Creates a new user
   * @param userData User data to create
   * @returns Created user and token
   */
  async createUser(userData: CreateUserParams): Promise<{ user: UserDocument; token: string }> {
    try {
      logger.info(`Creating new user with email: ${userData.email}`);

      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        logger.warn(`User with email ${userData.email} already exists`);
        throw new Error('A user already exists with this email');
      }

      // Verificar también si el username ya existe
      const existingUsername = await User.findOne({ username: userData.username });
      if (existingUsername) {
        logger.warn(`User with username ${userData.username} already exists`);
        throw new Error('A user already exists with this username');
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(userData.password, salt);

      // Crear objeto con los datos para el modelo
      const userToCreate = {
        username: userData.username,
        email: userData.email,
        passwordHash,
        profilePicture: userData.profilePicture,
        role: userData.role,
        autonomousCommunity: userData.autonomousCommunity,
      };

      const user = new User(userToCreate);
      const savedUser = await user.save();

      const token = genJWT({
        id: savedUser._id,
        username: savedUser.username,
        email: savedUser.email,
        role: savedUser.role,
        isAdmin: savedUser.isAdmin,
      } as JWTPayload);

      // Remove password from response
      const userResponse = savedUser.toObject();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash: _, ...createUserData } = userResponse;

      logger.info(`User created successfully with ID: ${savedUser._id}`);
      return { user: createUserData as unknown as UserDocument, token };
    } catch (error) {
      logger.error(`Error creating user: ${error}`);
      throw error;
    }
  }

  /**
   * Authenticates a user and generates a JWT token
   * @param emailOrUsername User email or username
   * @param password User password
   * @returns Object with user and token if authenticated, null otherwise
   */
  async loginUser(
    emailOrUsername: string,
    password: string,
  ): Promise<{ user: UserDocument; token: string } | null> {
    try {
      logger.info(`Authenticating user with email/username: ${emailOrUsername}`);

      // Find user by email or username
      const user = await User.findOne({
        $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
      }).select('+passwordHash');

      if (!user) {
        logger.info(`Authentication failed: No user found with email/username: ${emailOrUsername}`);
        return null;
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, user.passwordHash);

      if (!isMatch) {
        logger.info(`Authentication failed: Invalid password for user: ${emailOrUsername}`);
        return null;
      }

      // Generate JWT token using the middleware function
      const token = genJWT({
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isAdmin: user.isAdmin,
      } as JWTPayload);

      // Remove password from user object
      const loginUserResponse = user.toObject();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash: loginPasswordHash, ...loginUserData } = loginUserResponse;

      // Asignar URL de imagen de perfil (propia o por defecto)
      await userService.assignProfilePictureUrl(loginUserData);

      logger.info(`User authenticated successfully: ${emailOrUsername}`);
      return { user: loginUserData as unknown as UserDocument, token };
    } catch (err) {
      logger.error(`Error authenticating user: ${err}`);
      throw err;
    }
  }
}

export default new AuthService();
