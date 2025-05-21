import logger from '../utils/logger';
import User, { UserRole, AutonomousComunity } from '../models/user.model';
import bcrypt from 'bcrypt';
import { genJWT, JWTPayload } from '../middleware/auth';
import userService from './user.service';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { GITHUB_API_URL, GithubPayload } from './constants';
import axios from 'axios';
import subscriptionService from './subscription.service';

export interface CreateUserParams {
  username: string;
  email: string;
  password?: string;
  role: UserRole;
  autonomousCommunity: AutonomousComunity;
  googleId?: string;
  githubId?: string;
  phoneNumber?: string;
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
  githubId?: string;
  phoneNumber?: string;
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
        phoneNumber: userData.phoneNumber,
      };

      if (!userData.password) {
        logger.info('Creating user from external provider account, passwordHash will not be set');
        userToCreate.googleId = userData.googleId;
        userToCreate.githubId = userData.githubId;
      } else {
        // Hash password
        userToCreate.passwordHash = await bcrypt.hash(userData.password, 12);
      }

      const user = new User(userToCreate);
      const savedUser = await user.save();

      // Suscribir usuario a tópicos SNS
      try {
        await subscriptionService.manageUserSubscriptions(savedUser.email, savedUser.phoneNumber);
        logger.info(`User subscribed to SNS topics: ${savedUser.email}`);
      } catch (subsError) {
        logger.error(`Error subscribing user to SNS topics: ${subsError}`);
        // No lanzamos error para no interrumpir el registro del usuario
      }

      const token = genJWT({
        id: savedUser._id,
        username: savedUser.username,
        email: savedUser.email,
        role: savedUser.role,
        isAdmin: savedUser.isAdmin,
        isBlocked: savedUser.isBlocked,
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
        isBlocked: user.isBlocked,
      } as JWTPayload);

      // Register login history
      user.loginHistory.push({
        timestamp: new Date(),
      });
      await user.save();

      // Remove password from user object
      const loginUserResponse = user.toObject();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash: loginPasswordHash, ...loginUserData } = loginUserResponse;

      // Asignar URL de imagen de perfil (propia o por defecto)
      try {
        await userService.assignProfilePictureUrl(loginUserData);
      } catch (err) {
        logger.error(`Failed to assign profile picture url: ${err}`);
      }

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

      // Register login history
      user.loginHistory.push({
        timestamp: new Date(),
      });
      await user.save();

      const token = genJWT({
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isAdmin: user.isAdmin,
        isBlocked: user.isBlocked,
      } as JWTPayload);
      const userDataToReturn = user.toObject();
      try {
        await userService.assignProfilePictureUrl(userDataToReturn);
      } catch (err) {
        logger.error(`Failed to assign profile picture url: ${err}`);
      }

      return { user: userDataToReturn as unknown as UserDocument, token };
    } catch (err) {
      logger.error(`Error authenticating google user: ${err}`);
      throw err;
    }
  }

  async verifyGithubToken(accessToken: string): Promise<GithubPayload | null> {
    try {
      const res = await axios.get(`${GITHUB_API_URL}/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const userData = res.data;
      if (userData) {
        return {
          // There's much more data, maybe useful in the future
          id: userData.id.toString(),
          login: userData.login,
          name: userData.name,
        };
      }
      return null;
    } catch (err: any) {
      logger.error('Error verifying GitHub token', err.message);
      return null;
    }
  }

  async loginGithubUser(
    username: string,
    email: string,
    githubId: string,
  ): Promise<{ user: UserDocument; token: string } | null> {
    try {
      // Find user by email or username
      const user = await User.findOne({ email, username, githubId }).select('-passwordHash');

      if (!user) {
        logger.info(
          `Authentication failed: No user found with email/username/githubId: ${email}/${username}/${githubId}`,
        );
        return null;
      }

      // Register login history
      user.loginHistory.push({
        timestamp: new Date(),
      });
      await user.save();

      const token = genJWT({
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isAdmin: user.isAdmin,
        isBlocked: user.isBlocked,
      } as JWTPayload);
      const userDataToReturn = user.toObject();
      try {
        await userService.assignProfilePictureUrl(userDataToReturn);
      } catch (err) {
        logger.error(`Failed to assign profile picture url: ${err}`);
      }

      return { user: userDataToReturn as unknown as UserDocument, token };
    } catch (err) {
      logger.error(`Error authenticating GitHub user: ${err}`);
      throw err;
    }
  }
}

export default new AuthService();
