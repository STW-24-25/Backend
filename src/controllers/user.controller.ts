import { Request, Response } from 'express';
import UserModel from '../models/user.model';
import bcrypt from 'bcrypt';
import logger from '../utils/logger';
import { genJWT } from '../middleware/auth';

/**
 * Creates a user and saves it in the DB.
 * @param req Request object already validated.
 * @param res Response object, will have 201 if save was succesful or 500 if an error ocurred.
 */
export const createUser = async (req: Request, res: Response) => {
  try {
    const passwdHash = await bcrypt.hash(req.body.password, 10);
    const newUser = new UserModel({
      username: req.body.username,
      email: req.body.email,
      passwordHash: passwdHash,
      profilePicture: req.body.profilePicture,
      role: req.body.role,
      autonomousCommunity: req.body.autonomousCommunity,
      isAdmin: false,
    });

    await newUser.save();

    res.status(201).json({ message: 'User created' });
    logger.info(`User created: ${req.body.username}`);
  } catch (err) {
    res.status(500).json({ message: 'Error creating user', err });
    logger.error('Error creating user', err);
  }
};

/**
 * todo
 * @param req
 * @param res
 * @returns void
 */
export const updateUser = async (req: Request, res: Response) => {
  logger.warn('updateUser endpoint not implemented yet');
  res.status(501).json('updateUser endpoint not implemented yet');
};

/**
 * todo
 * @param req
 * @param res
 * @returns void
 */
export const deleteUser = async (req: Request, res: Response) => {
  logger.warn('deleteUser endpoint not implemented yet');
  res.status(501);
};

/**
 * Attemts to login a user given it's username or email and password
 * @param req Request object, already validated
 * @param res Response object, either 200 if login was succesful, 401 if invalid credentials, or 500 otherwise
 * @returns void
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { usernameOrEmail, password } = req.body;
    const user = await UserModel.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    }).select('+passwordHash');

    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const passwordsMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordsMatch) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const payload = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      autonomousComunity: user.autonomousCommunity,
      isAdmin: user.isAdmin,
    };

    const token = genJWT(payload);

    res.json({ token, user: payload });
    logger.info(`User ${user.username} logged in`);
  } catch (err) {
    logger.error('Login error', err);
    res.status(500).json({ message: 'Login failed', err });
  }
};

/**
 * todo
 * @param req
 * @param res
 * @returns void
 */
export const getUser = async (req: Request, res: Response) => {
  logger.warn('getUser endpoint not implemented yet');
  res.status(501);
};

/**
 * todo
 * @param req
 * @param res
 * @returns void
 */
export const requestUnblock = async (req: Request, res: Response) => {
  logger.warn('requestUnblock endpoint not implemented yet');
  res.status(501);
};

/**
 * todo
 * @param req
 * @param res
 * @returns void
 */
export const getAllUsers = async (req: Request, res: Response) => {
  logger.warn('getAllUsers endpoint not implemented yet');
  res.status(501).json('updateUser endpoint not implemented yet');
};

/**
 * todo
 * @param req
 * @param res
 * @returns void
 */
export const blockUser = async (req: Request, res: Response) => {
  logger.warn('blockUser endpoint not implemented yet');
  res.status(501);
};

/**
 * todo
 * @param req
 * @param res
 * @returns void
 */
export const unBlockUser = async (req: Request, res: Response) => {
  logger.warn('unBlockUser endpoint not implemented yet');
  res.status(501);
};
