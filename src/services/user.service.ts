import User, { UserRole, AutonomousComunity } from '../models/user.model';
import { Types, Document } from 'mongoose';
import logger from '../utils/logger';
import bcrypt from 'bcrypt';
import { genJWT } from '../middleware/auth';

// Definimos una interfaz para el usuario basada en el modelo
interface UserDocument extends Document {
  username: string;
  email: string;
  passwordHash?: string;
  profilePicture?: string;
  role: UserRole;
  autonomousCommunity: AutonomousComunity;
  isAdmin: boolean;
  createdAt: Date;
}

// Interfaces para los parámetros de los métodos
interface CreateUserParams {
  username: string;
  email: string;
  password: string;
  profilePicture?: string;
  role?: UserRole;
  autonomousCommunity?: AutonomousComunity;
  isAdmin?: boolean;
}

interface UpdateUserParams {
  username?: string;
  email?: string;
  password?: string;
  profilePicture?: string;
  role?: UserRole;
  autonomousCommunity?: AutonomousComunity;
  isAdmin?: boolean;
}

interface SearchUserParams {
  username?: string;
  email?: string;
  role?: UserRole;
  autonomousCommunity?: AutonomousComunity;
  isAdmin?: boolean;
}

class UserService {
  /**
   * Creates a new user
   * @param userData User data to create
   * @returns Created user
   */
  async createUser(userData: CreateUserParams): Promise<UserDocument> {
    try {
      logger.info(`Creating new user with email: ${userData.email}`);

      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        logger.warn(`User with email ${userData.email} already exists`);
        throw new Error('User already exists with this email');
      }

      // Verificar también si el username ya existe
      const existingUsername = await User.findOne({ username: userData.username });
      if (existingUsername) {
        logger.warn(`User with username ${userData.username} already exists`);
        throw new Error('User already exists with this username');
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
        role: userData.role || UserRole.SMALL_FARMER,
        autonomousCommunity: userData.autonomousCommunity || AutonomousComunity.ARAGON,
        isAdmin: userData.isAdmin || false,
      };

      const user = new User(userToCreate);
      const savedUser = await user.save();

      // Remove password from response
      const userResponse = savedUser.toObject();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash: createUserPasswordHash, ...createUserData } = userResponse;

      logger.info(`User created successfully with ID: ${savedUser._id}`);
      return createUserData as unknown as UserDocument;
    } catch (error) {
      logger.error(`Error creating user: ${error}`);
      throw error;
    }
  }

  /**
   * Finds a user by ID
   * @param userId User ID
   * @param includePassword Whether to include password in the response
   * @returns User if found, null otherwise
   */
  async findUserById(userId: string, includePassword = false): Promise<UserDocument | null> {
    try {
      logger.info(`Finding user by ID: ${userId}`);

      if (!Types.ObjectId.isValid(userId)) {
        logger.warn(`Invalid user ID format: ${userId}`);
        return null;
      }

      const user = await User.findById(userId).select(
        includePassword ? '+passwordHash' : '-passwordHash',
      );

      if (!user) {
        logger.info(`No user found with ID: ${userId}`);
        return null;
      }

      logger.info(`User found with ID: ${userId}`);
      return user as UserDocument;
    } catch (error) {
      logger.error(`Error finding user by ID: ${error}`);
      throw error;
    }
  }

  /**
   * Finds a user by email
   * @param email User email
   * @param includePassword Whether to include password in the response
   * @returns User if found, null otherwise
   */
  async findUserByEmail(email: string, includePassword = false): Promise<UserDocument | null> {
    try {
      logger.info(`Finding user by email: ${email}`);
      const user = await User.findOne({ email }).select(
        includePassword ? '+passwordHash' : '-passwordHash',
      );

      if (!user) {
        logger.info(`No user found with email: ${email}`);
        return null;
      }

      logger.info(`User found with email: ${email}`);
      return user as UserDocument;
    } catch (error) {
      logger.error(`Error finding user by email: ${error}`);
      throw error;
    }
  }

  /**
   * Finds a user by username
   * @param username Username
   * @param includePassword Whether to include password in the response
   * @returns User if found, null otherwise
   */
  async findUserByUsername(
    username: string,
    includePassword = false,
  ): Promise<UserDocument | null> {
    try {
      logger.info(`Finding user by username: ${username}`);
      const user = await User.findOne({ username }).select(
        includePassword ? '+passwordHash' : '-passwordHash',
      );

      if (!user) {
        logger.info(`No user found with username: ${username}`);
        return null;
      }

      logger.info(`User found with username: ${username}`);
      return user as UserDocument;
    } catch (error) {
      logger.error(`Error finding user by username: ${error}`);
      throw error;
    }
  }

  /**
   * Updates a user
   * @param userId User ID
   * @param updateData Data to update
   * @returns Updated user
   */
  async updateUser(userId: string, updateData: UpdateUserParams): Promise<UserDocument | null> {
    try {
      logger.info(`Updating user with ID: ${userId}`);

      if (!Types.ObjectId.isValid(userId)) {
        logger.warn(`Invalid user ID format: ${userId}`);
        return null;
      }

      // Preparar datos para actualizar
      const updateFields: any = { ...updateData };

      // Si se actualiza el username, verificar que no exista
      if (updateFields.username) {
        const existingUsername = await User.findOne({
          username: updateFields.username,
          _id: { $ne: userId }, // Excluir al usuario actual
        });

        if (existingUsername) {
          logger.warn(`Username ${updateFields.username} already in use`);
          throw new Error(`Username ${updateFields.username} already in use`);
        }
      }

      // Si se actualiza el email, verificar que no exista
      if (updateFields.email) {
        const existingEmail = await User.findOne({
          email: updateFields.email,
          _id: { $ne: userId }, // Excluir al usuario actual
        });

        if (existingEmail) {
          logger.warn(`Email ${updateFields.email} already in use`);
          throw new Error(`Email ${updateFields.email} already in use`);
        }
      }

      // Si se actualiza la contraseña, hashearla
      if (updateFields.password) {
        const salt = await bcrypt.genSalt(10);
        updateFields.passwordHash = await bcrypt.hash(updateFields.password, salt);
        delete updateFields.password; // Eliminar password del objeto
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updateFields },
        { new: true, runValidators: true },
      ).select('-passwordHash');

      if (!user) {
        logger.info(`No user found to update with ID: ${userId}`);
        return null;
      }

      logger.info(`User updated successfully with ID: ${userId}`);
      return user as UserDocument;
    } catch (error) {
      logger.error(`Error updating user: ${error}`);
      throw error;
    }
  }

  /**
   * Deletes a user
   * @param userId User ID to delete
   * @returns Boolean indicating if user was deleted
   */
  async deleteUser(userId: string): Promise<boolean> {
    try {
      logger.info(`Deleting user with ID: ${userId}`);

      if (!Types.ObjectId.isValid(userId)) {
        logger.warn(`Invalid user ID format: ${userId}`);
        return false;
      }

      const result = await User.findByIdAndDelete(userId);

      if (!result) {
        logger.info(`No user found to delete with ID: ${userId}`);
        return false;
      }

      logger.info(`User deleted successfully with ID: ${userId}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting user: ${error}`);
      throw error;
    }
  }

  /**
   * Finds all users
   * @param limit Number of users to return (optional)
   * @param skip Number of users to skip (optional)
   * @returns Array of users
   */
  async findAllUsers(limit?: number, skip?: number): Promise<UserDocument[]> {
    try {
      logger.info(`Finding all users${limit ? ` (limit: ${limit}, skip: ${skip})` : ''}`);

      let query = User.find().select('-passwordHash');

      if (skip) {
        query = query.skip(skip);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const users = await query.exec();

      logger.info(`Found ${users.length} users`);
      return users as UserDocument[];
    } catch (error) {
      logger.error(`Error finding all users: ${error}`);
      throw error;
    }
  }

  /**
   * Counts total users
   * @returns Total number of users
   */
  async countUsers(): Promise<number> {
    try {
      logger.info('Counting total users');
      const count = await User.countDocuments();
      logger.info(`Total users count: ${count}`);
      return count;
    } catch (error) {
      logger.error(`Error counting users: ${error}`);
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

      // Verify that passwordHash exists
      if (!user.passwordHash) {
        logger.error(`Authentication failed: Password hash not found for user: ${emailOrUsername}`);
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
      });

      // Remove password from user object
      const loginUserResponse = user.toObject();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash: loginPasswordHash, ...loginUserData } = loginUserResponse;

      logger.info(`User authenticated successfully: ${emailOrUsername}`);
      return { user: loginUserData as unknown as UserDocument, token };
    } catch (error) {
      logger.error(`Error authenticating user: ${error}`);
      throw error;
    }
  }

  /**
   * Changes user password
   * @param userId User ID
   * @param currentPassword Current password
   * @param newPassword New password
   * @returns Boolean indicating if password was changed
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<boolean> {
    try {
      logger.info(`Changing password for user ${userId}`);

      if (!Types.ObjectId.isValid(userId)) {
        logger.warn(`Invalid user ID format: ${userId}`);
        return false;
      }

      // Find user with password
      const user = await User.findById(userId).select('+passwordHash');

      if (!user) {
        logger.info(`No user found with ID: ${userId}`);
        return false;
      }

      // Verify that passwordHash exists
      if (!user.passwordHash) {
        logger.error(`Password change failed: Password hash not found for user: ${userId}`);
        return false;
      }

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);

      if (!isMatch) {
        logger.info(`Password change failed: Current password is incorrect for user ${userId}`);
        return false;
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update password
      await User.findByIdAndUpdate(userId, { passwordHash: hashedPassword });

      logger.info(`Password changed successfully for user ${userId}`);
      return true;
    } catch (error) {
      logger.error(`Error changing password: ${error}`);
      throw error;
    }
  }

  /**
   * Finds users by search criteria
   * @param searchParams Search parameters
   * @returns Array of matching users
   */
  async findUsersBySearchCriteria(searchParams: SearchUserParams): Promise<UserDocument[]> {
    try {
      logger.info(`Searching users with criteria: ${JSON.stringify(searchParams)}`);

      // Build query based on provided parameters
      const query: any = {};

      if (searchParams.username) {
        query.username = { $regex: searchParams.username, $options: 'i' }; // Case-insensitive search
      }

      if (searchParams.email) {
        query.email = { $regex: searchParams.email, $options: 'i' };
      }

      if (searchParams.role) {
        query.role = searchParams.role;
      }

      if (searchParams.autonomousCommunity) {
        query.autonomousCommunity = searchParams.autonomousCommunity;
      }

      if (searchParams.isAdmin !== undefined) {
        query.isAdmin = searchParams.isAdmin;
      }

      const users = await User.find(query).select('-passwordHash');

      logger.info(`Found ${users.length} users matching criteria`);
      return users as UserDocument[];
    } catch (error) {
      logger.error(`Error searching users: ${error}`);
      throw error;
    }
  }

  /**
   * Checks if a user token is valid
   * @param userId User ID
   * @returns Boolean indicating if token is valid
   */
  async validateUserToken(userId: string): Promise<boolean> {
    try {
      logger.info(`Validating token for user ${userId}`);

      if (!Types.ObjectId.isValid(userId)) {
        logger.warn(`Invalid user ID format: ${userId}`);
        return false;
      }

      // Check if user exists
      const user = await User.findById(userId);

      if (!user) {
        logger.info(`Token validation failed: No user found with ID: ${userId}`);
        return false;
      }

      logger.info(`Token validated successfully for user ${userId}`);
      return true;
    } catch (error) {
      logger.error(`Error validating token: ${error}`);
      return false;
    }
  }
}

export default new UserService();
