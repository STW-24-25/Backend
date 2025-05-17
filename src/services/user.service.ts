import User, { UserRole, AutonomousComunity } from '../models/user.model';
import { Types, Document } from 'mongoose';
import logger from '../utils/logger';
import bcrypt from 'bcrypt';
import { genJWT, JWTPayload } from '../middleware/auth';
import { S3Service } from '../services/s3.service';

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
}

interface UpdateUserParams {
  username?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  autonomousCommunity?: AutonomousComunity;
}

class UserService {
  /**
   * Creates a new user
   * @param userData User data to create
   * @returns Created user
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
        role: userData.role || UserRole.SMALL_FARMER,
        autonomousCommunity: userData.autonomousCommunity || AutonomousComunity.ARAGON,
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
   * Asigna una URL de imagen de perfil al objeto de usuario
   * @param userObject Objeto de usuario a modificar
   * @returns Promise con el objeto modificado
   */
  async assignProfilePictureUrl(userObject: any): Promise<any> {
    if (userObject.profilePicture) {
      // Si el usuario tiene foto de perfil, usa esa
      userObject.profilePicture = await S3Service.getSignedUrl(userObject.profilePicture);
    } else {
      // Si no tiene, usa la foto por defecto
      userObject.profilePicture = await S3Service.getDefaultProfilePictureUrl();
    }
    return userObject;
  }

  /**
   * Finds a user by ID
   * @param userId User ID
   * @param includePassword Whether to include password in the response (default: false)
   * @returns User if found, null otherwise
   */
  async getUserById(userId: string, includePassword = false): Promise<UserDocument | null> {
    try {
      logger.info(`Finding user by ID: ${userId}`);

      if (!Types.ObjectId.isValid(userId)) {
        logger.warn(`Invalid user ID format: ${userId}`);
        return null;
      }

      const user = await User.findById(userId)
        .select(includePassword ? '+passwordHash' : '-passwordHash')
        .lean();

      logger.debug(`User: ${JSON.stringify(user)}`);

      if (!user) {
        logger.info(`No user found with ID: ${userId}`);
        return null;
      }

      logger.info(`User found with ID: ${userId}`);

      // Convertir a objeto plano para agregar la URL de imagen
      await this.assignProfilePictureUrl(user);

      return user as UserDocument;
    } catch (error) {
      logger.error(`Error finding user by ID: ${error}`);
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
  async getAllUsers(
    username: string | undefined,
    email: string | undefined,
    role: UserRole | undefined,
    autCom: AutonomousComunity | undefined,
    isAdmin: boolean | undefined,
    hasAppealed: boolean | undefined,
    page: number,
    size: number,
  ): Promise<{ users: UserDocument[]; totalPages: number }> {
    try {
      const query: any = {};

      if (username) {
        query.username = { $regex: username, $options: 'i' }; // Case-insensitive search
      }

      if (email) {
        query.email = { $regex: email, $options: 'i' };
      }

      if (role) {
        query.role = role;
      }

      if (autCom) {
        query.autonomousCommunity = autCom;
      }

      if (isAdmin) {
        query.isAdmin = isAdmin;
      }

      if (hasAppealed) {
        query.isBlocked = true;
        query.unblockAppeal = { $exists: true, $ne: null };
        query['unblockAppeal.content'] = { $exists: true, $ne: '' };
      }

      const totalPages = Math.ceil((await User.countDocuments(query)) / size);

      const users = await User.find(query)
        .select('-passwordHash')
        .skip((page - 1) * size)
        .limit(size)
        .lean();

      // Process all user profile pictures in parallel
      await Promise.all(users.map(user => this.assignProfilePictureUrl(user)));

      logger.info(`Found ${users.length} users`);
      return { users: users as UserDocument[], totalPages };
    } catch (err) {
      logger.error(`Error finding all users: ${err}`);
      throw err;
    }
  }

  /**
   * Counts total users
   * @returns Total number of users
   */
  async countUsers(): Promise<number> {
    try {
      const count = await User.countDocuments();
      logger.info(`Total users count: ${count}`);
      return count;
    } catch (err) {
      logger.error(`Error counting users: ${err}`);
      throw err;
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
      } as JWTPayload);

      // Remove password from user object
      const loginUserResponse = user.toObject();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash: loginPasswordHash, ...loginUserData } = loginUserResponse;

      // Asignar URL de imagen de perfil (propia o por defecto)
      await this.assignProfilePictureUrl(loginUserData);

      logger.info(`User authenticated successfully: ${emailOrUsername}`);
      return { user: loginUserData as unknown as UserDocument, token };
    } catch (err) {
      logger.error(`Error authenticating user: ${err}`);
      throw err;
    }
  }

  /**
   * Flags a user as blocked, saving the reason for it.
   * @param userId The user ID to block
   * @param reason The reason for the blocking
   * @returns True if the user was succesfully blocked, false otherwise
   */
  async blockUser(userId: string, reason: string): Promise<boolean> {
    try {
      const result = await User.findByIdAndUpdate(userId, {
        $set: { isBlocked: true, blockReason: reason },
      });

      if (!result) {
        logger.warn(`Failed to block user with id ${userId}`);
        return false;
      }
      return true;
    } catch (err) {
      logger.error(`Error blocking user: ${err}`);
      throw err;
    }
  }

  /**
   * Flags a user as unblocked, removing the unblocking appeal.
   * @param userId The user ID to unblock
   */
  async unblockUser(userId: string): Promise<boolean> {
    try {
      const result = await User.findByIdAndUpdate(userId, {
        $set: { isBlocked: false },
        $unset: { blockReason: '', unblockAppeal: '' },
      });

      if (!result) {
        logger.warn(`Failed to unblock user with id ${userId}`);
        return false;
      }
      return true;
    } catch (err) {
      logger.error(`Error unblocking user: ${err}`);
      throw err;
    }
  }

  /**
   * Registers the user appeal to be unblocked
   * @param userId The user ID requesting to be unblocked
   * @param appeal Appeal description and reasons presented to unblock the user
   * @returns Boolean indicating whether the unblock appeal was registered succesfully
   */
  async requestUnblock(userId: string, appeal: string): Promise<boolean> {
    try {
      const result = await User.findByIdAndUpdate(userId, {
        $set: {
          unblockAppeal: {
            content: appeal,
            createdAt: new Date(),
          },
        },
      });
      if (!result) {
        logger.warn(`Failed to unblock user with id ${userId}`);
        return false;
      }
      return true;
    } catch (err) {
      logger.error(`Error unblocking user: ${err}`);
      throw err;
    }
  }

  /**
   * Promotes a user to admin role
   * @param userId The user ID to promote
   * @returns True if the user was successfully promoted, false otherwise
   */
  async makeAdmin(userId: string): Promise<boolean> {
    try {
      const result = await User.findByIdAndUpdate(userId, { $set: { isAdmin: true } });

      if (!result) {
        logger.warn(`Failed to promote user with id ${userId}`);
        return false;
      }
      return true;
    } catch (err) {
      logger.error(`Error promoting user to admin: ${err}`);
      throw err;
    }
  }

  /**
   * Refreshes signed URLs for user profile pictures
   * @param userIds Array of user IDs to refresh images for
   * @returns Object containing user IDs mapped to their signed image URLs
   */
  async refreshUserImages(userIds: string[]): Promise<Record<string, string>> {
    const images: Record<string, string> = {};

    await Promise.all(
      userIds.map(async (userId: string) => {
        const user = await User.findById(userId);
        if (user?.profilePicture) {
          images[userId] = await S3Service.getSignedUrl(user.profilePicture);
        } else {
          images[userId] = await S3Service.getDefaultProfilePictureUrl();
        }
      }),
    );

    return images;
  }

  /**
   * Uploads a profile picture for a user
   * @param userId User ID
   * @param file Image file
   * @returns The S3 key of the uploaded image
   */
  async uploadProfilePicture(userId: string, file: Express.Multer.File): Promise<string> {
    try {
      logger.info(`Uploading profile picture for user: ${userId}`);

      // Process image using centralized method
      const processedImageBuffer = await S3Service.processImage(file.buffer);

      const fileExtension = 'jpg'; // Always use jpg after processing
      const key = S3Service.generateUserProfileKey(userId, fileExtension);

      const s3Key = await S3Service.uploadFile(processedImageBuffer, key, 'image/jpeg');

      const user = await User.findByIdAndUpdate(userId, { profilePicture: s3Key }, { new: true });

      if (!user) {
        logger.warn(`User not found: ${userId}`);
        throw new Error('User not found');
      }

      logger.info(`Profile picture successfully uploaded for user: ${userId}`);
      return s3Key;
    } catch (error) {
      logger.error(`Error uploading profile picture: ${error}`);
      throw error;
    }
  }

  /**
   * Deletes a user's profile picture
   * @param userId User ID
   * @returns true if successfully deleted, false if user not found
   */
  async deleteProfilePicture(userId: string): Promise<boolean> {
    try {
      logger.info(`Deleting profile picture for user: ${userId}`);

      const user = await User.findById(userId);
      if (!user) {
        logger.warn(`User not found: ${userId}`);
        return false;
      }

      if (!user.profilePicture) {
        logger.warn(`User ${userId} has no profile picture to delete`);
        return false;
      }

      await S3Service.deleteFile(user.profilePicture);

      user.profilePicture = undefined;
      await user.save();

      logger.info(`Profile picture successfully deleted for user: ${userId}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting profile picture: ${error}`);
      throw error;
    }
  }
}

export { UserService };
export default new UserService();
