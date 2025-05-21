import User, { UserRole, AutonomousComunity } from '../models/user.model';
import { Types, Document } from 'mongoose';
import logger from '../utils/logger';
import bcrypt from 'bcrypt';
import S3Service from '../services/s3.service';
import UserModel from '../models/user.model';
import subscriptionService from './subscription.service';

import MessageModel from '../models/message.model';
import ParcelModel from '../models/parcel.model';
interface UserDocument extends Document {
  username: string;
  email: string;
  passwordHash?: string;
  profilePicture?: string;
  role: UserRole;
  autonomousCommunity: AutonomousComunity;
  isAdmin: boolean;
  isBlocked: boolean;
  createdAt: Date;
  googleId?: string;
  githubId?: string;
  phoneNumber?: string;
}

interface UpdateUserParams {
  username?: string;
  password?: string;
  role?: UserRole;
  autonomousCommunity?: AutonomousComunity;
  email?: string;
  phoneNumber?: string;
}

interface UpdateUserPasswordParams {
  newPassword: string;
  currentPassword?: string;
}

/**
 * Service for managing user operations in the application.
 *
 * This service handles various user-related functionalities, including:
 * - User profile management (retrieve, update, delete)
 * - Profile picture handling (upload, delete, URL signing)
 * - User blocking and unblocking operations
 * - Admin role management
 * - OAuth provider integration (Google, GitHub)
 * - User search and filtering
 *
 * It interfaces with the User model for database operations and the S3Service
 * for handling file storage operations related to profile pictures.
 */
class UserService {
  /**
   * Asigna una URL de imagen de perfil al objeto de usuario
   * @param userObject Objeto de usuario a modificar
   * @returns Promise con el objeto modificado
   */
  async assignProfilePictureUrl(userObject: any): Promise<any> {
    try {
      if (userObject.profilePicture) {
        // Si el usuario tiene foto de perfil, usa esa
        userObject.profilePicture = await S3Service.getSignedUrl(userObject.profilePicture);
      } else {
        // Si no tiene, usa la foto por defecto
        userObject.profilePicture = await S3Service.getDefaultProfilePictureUrl();
      }
      return userObject;
    } catch (err) {
      logger.error(`Error assigning profile picture url: ${err}`);
      throw new Error(`Error assigning profile picture url: ${err}`);
    }
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

      const user = await User.findOne({ _id: userId })
        .select(includePassword ? '+passwordHash' : '-passwordHash')
        .lean();

      if (!user) {
        logger.info(`No user found with Id: ${userId}`);
        return null;
      }

      logger.info(`User found with Id: ${userId}`);

      // Convertir a objeto plano para agregar la URL de imagen
      await this.assignProfilePictureUrl(user);

      return user as UserDocument;
    } catch (error) {
      logger.error(`Error finding user by Id: ${error}`);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<UserDocument | null> {
    try {
      logger.info('Finding user by email');

      const user = await User.findOne({ email }).lean();
      if (!user) {
        logger.info(`No user found with email: ${email}`);
        return null;
      }

      await this.assignProfilePictureUrl(user);

      return user as UserDocument;
    } catch (err) {
      logger.error(`Error finding user by email: ${err}`);
      throw err;
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

      // Si se actualiza la contraseña, hashearla
      if (updateFields.password) {
        const salt = await bcrypt.genSalt(10);
        updateFields.passwordHash = await bcrypt.hash(updateFields.password, salt);
        delete updateFields.password; // Eliminar password del objeto
      }

      // Obtener usuario antes de actualizar para comparar email/teléfono
      const oldUser = await User.findOne({ _id: userId });

      if (!oldUser) {
        logger.info(`No user found with ID: ${userId}`);
        return null;
      }

      const user = await User.findOneAndUpdate(
        { _id: oldUser._id },
        { $set: updateFields },
        { new: true, runValidators: true },
      ).select('-passwordHash');

      if (!user) {
        logger.info(`No user found to update with ID: ${userId}`);
        return null;
      }

      // Actualizar suscripciones SNS si cambió el email o teléfono
      if (
        oldUser &&
        ((updateFields.email && oldUser.email !== updateFields.email) ||
          (updateFields.phoneNumber && oldUser.phoneNumber !== updateFields.phoneNumber))
      ) {
        try {
          await subscriptionService.updateUserSubscriptions(user.email, user.phoneNumber);
          logger.info(`Updated SNS subscriptions for user: ${user.email}`);
        } catch (subsError) {
          logger.error(`Error updating SNS subscriptions: ${subsError}`);
          // No interrumpimos la actualización si falla la suscripción
        }
      }

      logger.info(`User updated successfully with ID: ${userId}`);
      return user as UserDocument;
    } catch (error) {
      logger.error(`Error updating user: ${error}`);
      throw error;
    }
  }

  async updateUserPassword(
    userId: string,
    params: UpdateUserPasswordParams,
  ): Promise<
    | 'success'
    | 'not_found'
    | 'invalid_current_password'
    | 'oauth_user_no_current_password_expected'
    | 'current_password_required'
    | 'unknown_error'
  > {
    try {
      const user = await User.findOne({ _id: userId }).select('+passwordHash +googleId +githubId');
      if (!user) {
        return 'not_found';
      }

      const { newPassword, currentPassword } = params;

      // User has an existing password (standard user or OAuth user who previously set one)
      if (user.passwordHash) {
        if (!currentPassword) {
          return 'current_password_required';
        }
        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
          return 'invalid_current_password';
        }
      } else {
        // User has no existing password
        if (currentPassword) {
          logger.warn(
            `User ${userId} (OAuth user) attempted to set first password but provided a currentPassword.`,
          );
          return 'oauth_user_no_current_password_expected';
        }
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await UserModel.findOneAndUpdate({ _id: userId }, { passwordHash });
      return 'success';
    } catch (error: any) {
      logger.error(`Error updating user password for ${userId}: ${error.message}`, error);
      return 'unknown_error';
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

      // Soft-delete messages authored by this user
      const messageUpdateResult = await MessageModel.updateMany(
        { author: userId, isDeleted: { $ne: true } }, // Find messages by this author that are not already soft-deleted
        { $set: { isDeleted: true } }, // Set isDeleted to true
      );

      // Hard-delete the parcels of the user
      // Fetch the user document to get the list of parcel IDs
      const userDocForParcels = await User.findById(userId).select('parcels').lean();
      let parcelsUpdateResult = { deletedCount: 0 };

      if (!userDocForParcels) {
        logger.info(`No active user found to soft delete with ID: ${userId}`);
        return false;
      }

      parcelsUpdateResult = await ParcelModel.deleteMany({
        _id: { $in: userDocForParcels.parcels },
      });

      await User.findOneAndUpdate(
        { _id: userId, isDeleted: { $ne: true } }, // Ensure we only soft-delete non-deleted users
        { $set: { isDeleted: true, deletedAt: new Date(), parcels: [] } },
        { new: true },
      );

      logger.info(
        `Hard-Deleted ${parcelsUpdateResult.deletedCount} parcels for user ID: ${userId}`,
      );
      logger.info(
        `Soft-deleted ${messageUpdateResult.modifiedCount} messages for user ID: ${userId}`,
      );

      logger.info(`User soft-deleted successfully with ID: ${userId}`);
      return true;
    } catch (error) {
      logger.error(`Error soft-deleting user: ${error}`);
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
   * Flags a user as blocked, saving the reason for it.
   * @param userId The user ID to block
   * @param reason The reason for the blocking
   * @returns True if the user was succesfully blocked, false otherwise
   */
  async blockUser(userId: string, reason: string): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        logger.warn(`Failed to find user with id ${userId} for blocking`);
        return false;
      }

      // Eliminar suscripciones del usuario
      try {
        await subscriptionService.removeUserSubscriptions(user.email, user.phoneNumber);
        logger.info(`Removed SNS subscriptions for blocked user: ${user.email}`);
      } catch (subsError) {
        logger.error(`Error removing SNS subscriptions: ${subsError}`);
        // Continuamos con el bloqueo aunque falle la eliminación de suscripciones
      }

      const result = await User.findOneAndUpdate(
        { _id: userId },
        {
          $set: { isBlocked: true, blockReason: reason },
        },
      );

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
      const user = await User.findById(userId);
      if (!user) {
        logger.warn(`Failed to find user with id ${userId} for unblocking`);
        return false;
      }

      const result = await User.findOneAndUpdate(
        { _id: userId },
        {
          $set: { isBlocked: false },
          $unset: { blockReason: '', unblockAppeal: '' },
        },
      );

      if (!result) {
        logger.warn(`Failed to unblock user with id ${userId}`);
        return false;
      }

      // Restaurar suscripciones del usuario
      try {
        await subscriptionService.manageUserSubscriptions(user.email, user.phoneNumber);
        logger.info(`Restored SNS subscriptions for unblocked user: ${user.email}`);
      } catch (subsError) {
        logger.error(`Error restoring SNS subscriptions: ${subsError}`);
        // No interrumpimos el desbloqueo si falla la suscripción
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
      const result = await User.findOneAndUpdate(
        { _id: userId },
        {
          $set: {
            unblockAppeal: {
              content: appeal,
              createdAt: new Date(),
            },
          },
        },
      );
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
      const result = await User.findOneAndUpdate({ _id: userId }, { $set: { isAdmin: true } });

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
        const user = await User.findOne({ _id: userId });
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

      const user = await User.findOneAndUpdate(
        { _id: userId },
        { profilePicture: s3Key },
        { new: true },
      );

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

      const user = await User.findOne({ _id: userId });
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

  /**
   * Adds a provider ID (Google or GitHub) to a user account
   * @param userId The ID of the user to update
   * @param providerId The provider's unique identifier for this user
   * @param provider The authentication provider ('google' or 'github')
   * @returns Updated user document or null if user not found
   */
  async addProviderIdToUser(
    userId: string,
    providerId: string,
    provider: string,
  ): Promise<UserDocument | null> {
    try {
      logger.info(`Adding ${provider} Id to user with id ${userId}`);

      const updateObject = {
        [provider === 'google' ? 'googleId' : 'githubId']: providerId,
      };
      const user = await User.findOneAndUpdate(
        { _id: userId },
        { $set: updateObject },
        { new: true },
      ).select('-passwordHash');

      if (!user) {
        logger.warn(`No user found with id ${userId}`);
        return null;
      }

      return user;
    } catch (err) {
      logger.error(`Error adding ${provider} Id to user: ${err}`);
      return null;
    }
  }

  /**
   * Returns a user by its provider id (Google or GitHub)
   * @param providerId the provider id (Google or GitHub)
   * @param provider the provider type ('google' or 'github')
   * @returns the user or null
   */
  async getUserByProviderId(
    providerId: string,
    provider: 'google' | 'github',
  ): Promise<UserDocument | null> {
    try {
      const query = provider === 'google' ? { googleId: providerId } : { githubId: providerId };
      const user = await User.findOne(query).select('-passwordHash');

      if (!user) {
        logger.warn(`No user found with ${provider}Id = ${providerId}`);
        return null;
      }
      await this.assignProfilePictureUrl(user);

      return user as UserDocument;
    } catch (err) {
      logger.error(`Error finding user by ${provider}Id ${providerId}: ${err}`);
      throw err;
    }
  }
}

export { UserService };
export default new UserService();
