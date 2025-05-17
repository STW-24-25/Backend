import { Request, Response } from 'express';
import authService from '../services/auth.service';
import logger from '../utils/logger';
import userService from '../services/user.service';

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
      role: req.body.role,
      autonomousCommunity: req.body.autonomousCommunity,
    };

    const data = await authService.createUser(userData);
    res.status(201).json(data);
    logger.info(`User created: ${req.body.username}`);
  } catch (err: any) {
    res.status(500).json({ message: 'Error creating user', error: err.message });
    logger.error('Error creating user', err);
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
    const result = await authService.loginUser(usernameOrEmail, password);

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

export const googleLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user: googleUser } = req.body;
    const googlePayload = await authService.verifyGoogleToken(googleUser.id_token, googleUser.id);

    if (!googlePayload) {
      res.status(401).json({ message: 'Invalid Google ID token' });
      return;
    }

    const existingUser = await userService.getUserByGoogleId(googlePayload.sub);
    if (existingUser) {
      const result = await authService.loginGoogleUser(
        existingUser.username,
        existingUser.email,
        existingUser.googleId!,
      );
      if (!result) {
        res.status(401).json({ message: 'Somehow invalid credentials' });
      }

      res.status(200).json(result);
    } else {
      res.status(200).json({ needsMoreData: true, googlePayload });
    }
  } catch (err: any) {
    res.status(500).json({ message: 'Google login failed', error: err.message });
    logger.error('Google login error', err);
  }
};

export const googleRegister = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user: googleUser, userData } = req.body;
    const googlePayload = await authService.verifyGoogleToken(googleUser.id_token, googleUser.id);

    if (!googlePayload) {
      res.status(401).json({ message: 'Invalid Google ID token' });
      return;
    }

    const existingUser = await userService.getUserByGoogleId(googlePayload.sub);
    if (existingUser) {
      res.status(409).json({ message: 'Google account already linked to an existing user' });
      return;
    }

    const { user: createdUser, token } = await authService.createUser({
      username: userData.username,
      email: googleUser.email,
      role: userData.role,
      autonomousCommunity: userData.autonomousCommunity,
      googleId: googlePayload.sub,
    });

    res.status(201).json({ user: createdUser, token });
    logger.info(`New user registered with Google: ${createdUser.email}`);
  } catch (err: any) {
    res.status(500).json({ message: 'Google registration failed', error: err.message });
    logger.error('Google registration error', err);
  }
};
