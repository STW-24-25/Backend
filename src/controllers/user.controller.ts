import { Request, Response } from 'express';
import userService from '../services/user.service';
import logger from '../utils/logger';
import { AutonomousComunity, UserRole } from '../models/user.model';

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
    };

    await userService.createUser(userData);
    res.status(201).json({ message: 'User created successfully' });
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

    // TODO: Check the user trying to be deleted is the one making the request or admin if it's different

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
    res.status(500).json({ message: 'Login error', error: err.message });
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
    const user = await userService.getUserById(userId);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

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
    const page = parseInt(req.query.page as string) || 1; // Default to page 1
    const size = parseInt(req.query.size as string) || 10; // Default to size 16

    const { users, totalPages } = await userService.getAllUsers(
      username,
      email,
      role,
      autCom,
      isAdmin,
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
    const userId = req.body.id;
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
