import { Request, Response } from 'express';
import UserModel from '../models/user.model'
import bcrypt from 'bcrypt';
import logger from '../utils/logger';
import { z } from 'zod';
import { UserRole } from '../models/user.model';

// Zod schemas for request validation
const userSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  profilePicture: z.string().optional(),
  role: z.nativeEnum(UserRole),
});

/**
 * 
 * @param req 
 * @param res 
 * @returns void
 */
export const createUser = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const parsedUser = userSchema.parse(req.body);
    const passwdHash = await bcrypt.hash(parsedUser.password, 10)
    const newUser = new UserModel({
      username: parsedUser.username,
      email: parsedUser.email,
      passwordHash: passwdHash,
      profilePicture: parsedUser.profilePicture,
      role: parsedUser.role,
    });

    await newUser.save();
    res.status(201).json(newUser);
    logger.info(`User created: ${parsedUser.username}`);
  } catch (err) {
    res.status(500).json({ message: 'Error creating user', err })
    logger.error('Error creating user', err)
  }
}

/**
 * todo
 * @param req 
 * @param res 
 * @returns void
 */
export const updateUser = async (req: Request, res: Response) => {
  logger.warn('updateUser endpoint not implemented yet')
  res.status(501).json('updateUser endpoint not implemented yet');
};

export const deleteUser = async (req: Request, res: Response) => {
  logger.warn('deleteUser endpoint not implemented yet')
  res.status(501)
};

export const login = async (req: Request, res: Response) => {
  logger.warn('login endpoint not implemented yet')
  res.status(501)
};

export const getUser = async (req: Request, res: Response) => {
  logger.warn('getUser endpoint not implemented yet')
  res.status(501)
};

export const requestUnblock = async (req: Request, res: Response) => {
  logger.warn('requestUnblock endpoint not implemented yet')
  res.status(501)
};

export const getAllUsers = async (req: Request, res: Response) => {
  logger.warn('getAllUsers endpoint not implemented yet')
  res.status(501).json('updateUser endpoint not implemented yet')
};

export const blockUser = async (req: Request, res: Response) => {
  logger.warn('blockUser endpoint not implemented yet')
  res.status(501)
};

export const unBlockUser = async (req: Request, res: Response) => {
  logger.warn('unBlockUser endpoint not implemented yet')
  res.status(501)
};
