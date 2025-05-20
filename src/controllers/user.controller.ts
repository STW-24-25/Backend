import { Request, Response } from 'express';
import userService from '../services/user.service';
import logger from '../utils/logger';
import { AutonomousComunity, UserRole } from '../models/user.model';
import S3Service from '../services/s3.service';

/**
 * Updates an existing user.
 * @param req Request object containing the user data to update.
 * @param res Response object, will have 200 if update was successful, 404 if user not found, or 500 if an error occurred.
 * @returns Promise<void>
 */
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params && req.params.id ? req.params.id : req.auth.id;
    const updateData = req.body;

    // Handle profile picture if it's a file
    if (req.file) {
      // Upload the new profile picture to S3
      const s3Key = await userService.uploadProfilePicture(userId, req.file);
      // Add the S3 key to the update data
      updateData.profilePicture = s3Key;
    }

    const updatedUser = await userService.updateUser(userId, updateData);

    if (!updatedUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({ message: 'User updated successfully', user: updatedUser });
    logger.info(`User updated: ${userId}`);
  } catch (err: any) {
    res.status(500).json({ message: 'Error updating user', error: err.message });
    logger.error('Error updating user', err);
  }
};

/**
 * Updates a user's password.
 * @param req Request object containing the current password and new password.
 * @param res Response object, will have 200 if password update was successful, 401 if current password is incorrect, 404 if user not found, or 500 if an error occurred.
 * @returns Promise<void>
 */
export const updatePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.auth.id;
    const { currentPassword, newPassword } = req.body;

    if (!newPassword) {
      res.status(400).json({ message: 'New password is required' });
      return;
    }

    const serviceParams: {
      currentPassword?: string;
      newPassword: string;
    } = { newPassword };

    if (currentPassword) {
      serviceParams.currentPassword = currentPassword;
    }

    const result = await userService.updateUserPassword(userId, serviceParams);

    switch (result) {
      case 'success':
        res.status(200).json({ message: 'Password updated successfully' });
        logger.info(`Password updated for user: ${userId}`);
        break;
      case 'not_found':
        res.status(404).json({ message: 'User not found' });
        break;
      case 'invalid_current_password':
        res.status(401).json({ message: 'Current password is incorrect' });
        break;
      case 'oauth_user_no_current_password_expected':
        res.status(400).json({
          message:
            'Cannot provide current password when setting a password for the first time for an OAuth account.',
        });
        break;
      case 'current_password_required':
        res
          .status(400)
          .json({ message: 'Current password is required to change your existing password.' });
        break;
      default:
        logger.warn(`Unhandled result from userService.updateUserPassword: ${result}`);
        res.status(500).json({ message: 'An unexpected error occurred during password update' });
    }
  } catch (err: any) {
    res.status(500).json({ message: 'Error updating password', error: err.message });
    logger.error('Error updating password', err);
  }
};

/**
 * Deletes a user from the system.
 * @param req Request object containing user ID to delete.
 * @param res Response object, will have 200 if deletion was successful, 404 if user not found, or 500 if an error occurred.
 * @returns Promise<void>
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;

    // Check if the user being deleted is the authenticated or the one deleting is an admin
    if (userId !== req.auth.id && !req.auth.isAdmin) {
      res
        .status(403)
        .json({ message: 'Forbidden: You do not have permission to delete this user' });
      logger.warn(`Unauthorized delete attempt by user: ${req.auth.id}`);
      return;
    }

    const deleted = await userService.deleteUser(userId);

    if (!deleted) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({ message: 'User deleted successfully' });
    logger.info(`User deleted: ${userId}`);
  } catch (err: any) {
    res.status(500).json({ message: 'Error deleting user', error: err.message });
    logger.error('Error deleting user', err);
  }
};

/**
 * Gets user information by ID.
 * @param req Request object containing the user ID.
 * @param res Response object, will have 200 if user is found, 404 if not found, or 500 if an error occurred.
 * @returns Promise<void>
 */
export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;
    const user = await userService.getUserById(userId);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Ya no es necesario manejar la imagen de perfil aquí, lo hace el servicio

    res.status(200).json(user);
    logger.info(`User retrieved: ${userId}`);
  } catch (err: any) {
    res.status(500).json({ message: 'Error retrieving user', error: err.message });
    logger.error('Error retrieving user', err);
  }
};

/**
 * Gets all users with optional pagination.
 * @param req Request object with optional limit and skip parameters.
 * @param res Response object, will have 200 with users array or 500 if an error occurred.
 * @returns Promise<void>
 */
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const username = req.query.username as string | undefined;
    const email = req.query.email as string | undefined;
    const role = req.query.role as UserRole | undefined;
    const autCom = req.query.autCom as AutonomousComunity | undefined;
    const isAdmin = req.query.isAdmin as boolean | undefined;
    const hasAppealed = req.query.hasAppealed as boolean | undefined;
    const page = parseInt(req.query.page as string); // Default to page 1
    const size = parseInt(req.query.size as string); // Default to size 16

    const { users, totalPages } = await userService.getAllUsers(
      username,
      email,
      role,
      autCom,
      isAdmin,
      hasAppealed,
      page,
      size,
    );
    const totalUsers = await userService.countUsers();

    res.status(200).json({
      users: users,
      page: page,
      pageSize: size,
      totalUsers: totalUsers,
      totalPages: totalPages,
    });
    logger.info(`Retrieved all users: ${users.length}`);
  } catch (err: any) {
    res.status(500).json({ message: 'Error retrieving users', error: err.message });
    logger.error('Error retrieving users', err);
  }
};

/**
 * Requests to unblock a user account.
 * @param req Request object.
 * @param res Response object.
 * @returns Promise<void>
 */
export const requestUnblock = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.auth.id;
    const unblockAppeal = req.body.appeal;
    const blockedUser = await userService.requestUnblock(userId, unblockAppeal);

    if (!blockedUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({ message: 'Unblock appeal registered successfully' });
    logger.info(`User updated: ${userId}`);
  } catch (err: any) {
    res.status(500).json({ message: 'Error requesting to unblock user', error: err.message });
    logger.error('Error requesting to unblock user', err);
  }
};

/**
 * Blocks a user account.
 * @param req Request object.
 * @param res Response object.
 * @returns Promise<void>
 */
export const blockUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.body.id;
    const userBlocked = await userService.blockUser(userId, req.body.reason);

    if (!userBlocked) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({ message: 'User blocked successfully' });
    logger.info(`User ${userId} blocked`);
  } catch (err: any) {
    res.status(500).json({ message: 'Error blocking user', error: err.message });
    logger.error('Error blocking user', err);
  }
};

/**
 * Unblocks a user account and removes its unblock appeal.
 * @param req Request object.
 * @param res Response object.
 * @returns Promise<void>
 */
export const unblockUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.body.id;
    const userUnBlocked = await userService.unblockUser(userId);

    if (!userUnBlocked) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({ message: 'User unblocked successfully' });
    logger.info(`User ${userId} unblocked`);
  } catch (err: any) {
    res.status(500).json({ message: 'Error unblocking user', error: err.message });
    logger.error('Error unblocking user', err);
  }
};

export const makeAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.body.id;
    const promotedUser = await userService.makeAdmin(userId);

    if (!promotedUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({ message: 'User promoted to admin successfully' });
    logger.info(`User ${userId} promoted to admin`);
  } catch (err: any) {
    res.status(500).json({ message: 'Error promoting user to admin', error: err.message });
    logger.error('Error promoting user to admin', err);
  }
};

/**
 * Sube una foto de perfil para el usuario autenticado
 * @param req Request object con el archivo de imagen
 * @param res Response object
 */
export const uploadProfilePicture = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.auth.id;
    const file = req.file;

    if (!file) {
      res.status(400).json({ message: 'No file was uploaded' });
      return;
    }

    const s3Key = await userService.uploadProfilePicture(userId, file);
    const signedUrl = await S3Service.getSignedUrl(s3Key);
    res
      .status(200)
      .json({ message: 'User profile picture uploaded succesfully', imageUrl: signedUrl });
  } catch (error: any) {
    logger.error('Error uploading user profile picture:', error);
    res
      .status(500)
      .json({ message: 'Error uploading user profile picture:', error: error.message });
  }
};

/**
 * Deletes the authenticated user's profile picture
 * @param req Request object with authenticated user
 * @param res Response object
 */
export const deleteProfilePicture = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.auth.id;
    const deleted = await userService.deleteProfilePicture(userId);

    if (!deleted) {
      res.status(404).json({ message: 'User not found or has no profile picture' });
      return;
    }

    res.status(200).json({ message: 'Profile picture successfully deleted' });
  } catch (error: any) {
    logger.error('Error deleting profile picture:', error);
    res.status(500).json({ message: 'Error deleting profile picture', error: error.message });
  }
};

/**
 * Refreshes signed URLs for user profile pictures
 * @param req Request object containing user IDs to refresh
 * @param res Response object, will have 200 with refreshed image URLs or 500 if an error occurred
 * @returns Promise<void>
 */
export const refreshUserImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userIds } = req.body;
    const images = await userService.refreshUserImages(userIds);
    res.status(200).json({ images });
  } catch (error) {
    logger.error('Error refreshing user images:', error);
    res.status(500).json({ message: 'Error refreshing images' });
  }
};
