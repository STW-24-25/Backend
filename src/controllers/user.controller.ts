import { Request, Response } from 'express';
import userService from '../services/user.service';
import logger from '../utils/logger';

// Extended Request interface to include user property
interface AuthRequest extends Request {
  user?: {
    id: string;
    username?: string;
    email?: string;
    role?: string;
    isAdmin?: boolean;
  };
}

/**
 * Creates a user and saves it in the DB.
 * @param req Request object already validated.
 * @param res Response object, will have 201 if save was successful or 500 if an error occurred.
 * @returns Promise<void>
 */
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userData = {
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
      profilePicture: req.body.profilePicture,
      role: req.body.role,
      autonomousCommunity: req.body.autonomousCommunity,
      isAdmin: req.body.isAdmin || false,
    };

    const user = await userService.createUser(userData);
    res.status(201).json({ message: 'User created successfully', userId: user._id });
    logger.info(`User created: ${req.body.username}`);
  } catch (err: any) {
    res.status(500).json({ message: 'Error creating user', error: err.message });
    logger.error('Error creating user', err);
  }
};

/**
 * Updates an existing user.
 * @param req Request object containing the user data to update.
 * @param res Response object, will have 200 if update was successful, 404 if user not found, or 500 if an error occurred.
 * @returns Promise<void>
 */
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;
    const updateData = req.body;

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
 * Deletes a user from the system.
 * @param req Request object containing user ID to delete.
 * @param res Response object, will have 200 if deletion was successful, 404 if user not found, or 500 if an error occurred.
 * @returns Promise<void>
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;
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
 * Authenticates a user given their username or email and password.
 * @param req Request object containing login credentials.
 * @param res Response object, will have 200 if login was successful, 401 if invalid credentials, or 500 if an error occurred.
 * @returns Promise<void>
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { usernameOrEmail, password } = req.body;
    const result = await userService.loginUser(usernameOrEmail, password);

    if (!result) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const { user, token } = result;
    res.status(200).json({ token, user });
    logger.info(`User ${user.username} logged in`);
  } catch (err: any) {
    res.status(500).json({ message: 'Login failed', error: err.message });
    logger.error('Login error', err);
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
    const user = await userService.findUserById(userId);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({ user });
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
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const skip = req.query.skip ? parseInt(req.query.skip as string) : undefined;

    const users = await userService.findAllUsers(limit, skip);
    const total = await userService.countUsers();

    res.status(200).json({
      users,
      pagination: {
        total,
        limit,
        skip,
      },
    });
    logger.info(`Retrieved all users: ${users.length}`);
  } catch (err: any) {
    res.status(500).json({ message: 'Error retrieving users', error: err.message });
    logger.error('Error retrieving users', err);
  }
};

/**
 * Changes user password.
 * @param req Request object containing current and new password.
 * @param res Response object, will have 200 if password changed, 401 if current password is incorrect, or 500 if an error occurred.
 * @returns Promise<void>
 */
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;
    const { currentPassword, newPassword } = req.body;

    const success = await userService.changePassword(userId, currentPassword, newPassword);

    if (!success) {
      res.status(401).json({ message: 'Current password is incorrect or user not found' });
      return;
    }

    res.status(200).json({ message: 'Password changed successfully' });
    logger.info(`Password changed for user: ${userId}`);
  } catch (err: any) {
    res.status(500).json({ message: 'Error changing password', error: err.message });
    logger.error('Error changing password', err);
  }
};

/**
 * Validates if a user token is valid.
 * @param req Request object containing user ID from authenticated token.
 * @param res Response object, will have 200 if token is valid or 401 if invalid.
 * @returns Promise<void>
 */
export const validateToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id; // User ID is available from auth middleware

    if (!userId) {
      res.status(401).json({ message: 'Invalid token' });
      return;
    }

    const isValid = await userService.validateUserToken(userId);

    if (!isValid) {
      res.status(401).json({ message: 'Invalid token' });
      return;
    }

    res.status(200).json({ message: 'Token is valid' });
  } catch (err: any) {
    res.status(500).json({ message: 'Error validating token', error: err.message });
    logger.error('Error validating token', err);
  }
};

/**
 * Searches users based on various criteria.
 * @param req Request object containing search parameters.
 * @param res Response object, will have 200 with matching users or 500 if an error occurred.
 * @returns Promise<void>
 */
export const searchUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const searchParams = {
      username: req.query.username as string,
      email: req.query.email as string,
      role: req.query.role as any,
      autonomousCommunity: req.query.autonomousCommunity as any,
      isAdmin: req.query.isAdmin === 'true',
    };

    const users = await userService.findUsersBySearchCriteria(searchParams);

    res.status(200).json({ users, count: users.length });
    logger.info(`User search completed: ${users.length} results`);
  } catch (err: any) {
    res.status(500).json({ message: 'Error searching users', error: err.message });
    logger.error('Error searching users', err);
  }
};

// Note: these functions are placeholders for future implementation
// or are not needed with the current service layer approach

/**
 * Requests to unblock a user account.
 * @param req Request object.
 * @param res Response object.
 * @returns Promise<void>
 */
export const requestUnblock = async (req: Request, res: Response): Promise<void> => {
  res.status(501).json({ message: 'Feature not implemented yet' });
  logger.warn('requestUnblock endpoint not implemented yet');
};

/**
 * Blocks a user account.
 * @param req Request object.
 * @param res Response object.
 * @returns Promise<void>
 */
export const blockUser = async (req: Request, res: Response): Promise<void> => {
  res.status(501).json({ message: 'Feature not implemented yet' });
  logger.warn('blockUser endpoint not implemented yet');
};

/**
 * Unblocks a user account.
 * @param req Request object.
 * @param res Response object.
 * @returns Promise<void>
 */
export const unBlockUser = async (req: Request, res: Response): Promise<void> => {
  res.status(501).json({ message: 'Feature not implemented yet' });
  logger.warn('unBlockUser endpoint not implemented yet');
};
