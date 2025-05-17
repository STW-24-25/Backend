import logger from '../utils/logger';
import User, { UserRole, AutonomousComunity } from '../models/user.model';
import bcrypt from 'bcrypt';
import { genJWT, JWTPayload } from '../middleware/auth';
import userService from './user.service';
import { OAuth2Client, TokenPayload } from 'google-auth-library';

export interface CreateUserParams {
  username: string;
  email: string;
  password?: string;
  role: UserRole;
  autonomousCommunity: AutonomousComunity;
  googleId?: string;
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
  googleId?: string;
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

      const userToCreate: Partial<UserDocument> & { passwordHash?: string } = {
        username: userData.username,
        email: userData.email,
        role: userData.role,
        autonomousCommunity: userData.autonomousCommunity,
      };

      if (!userData.password) {
        logger.info('Creating user from google account, passwordHash will not be set');
        userToCreate.googleId = userData.googleId;
      } else {
        // Hash password
        userToCreate.passwordHash = await bcrypt.hash(userData.password, 12);
      }

      logger.debug(JSON.stringify(userToCreate, null, 2));

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

      if (!user.passwordHash) {
        logger.info(
          `Authentication failed: User ${emailOrUsername} has no password set. Try Google login.`,
        );
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

      // todo add login history (separate to reuse in loginGoogleUser)

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

  async verifyGoogleToken(token: string, googleId: string): Promise<TokenPayload | null> {
    try {
      const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();

      if (payload && payload.sub !== googleId) {
        logger.warn(
          `Google ID mismatch during registration. Token sub: ${payload.sub}, Received ID: ${googleId}`,
        );
        return null;
      }
      if (payload) {
        return payload;
      }
      logger.warn('Google payload empty');
      return null;
    } catch (err: any) {
      logger.error('Error verifying google token', err.message);
      return null;
    }
  }

  async loginGoogleUser(
    username: string,
    email: string,
    googleId: string,
  ): Promise<{ user: UserDocument; token: string } | null> {
    try {
      // Find user by email or username
      const user = await User.findOne({ email, username, googleId }).select('-passwordHash');

      if (!user) {
        logger.info(
          `Authentication failed: No user found with email/username/googleId: ${email}/${username}/${googleId}`,
        );
        return null;
      }

      const token = genJWT({
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isAdmin: user.isAdmin,
      } as JWTPayload);
      const userDataToReturn = user.toObject();
      await userService.assignProfilePictureUrl(userDataToReturn);

      return { user: userDataToReturn as unknown as UserDocument, token };
    } catch (err) {
      logger.error(`Error authenticating google user: ${err}`);
      throw err;
    }
  }
}

export default new AuthService();
