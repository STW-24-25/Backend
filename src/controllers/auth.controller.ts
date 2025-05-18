import { Request, Response } from 'express';
import authService from '../services/auth.service';
import logger from '../utils/logger';
import userService from '../services/user.service';
import { genJWT, JWTPayload } from '../middleware/auth';

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

/**
 * Authenticates a user given its google OAuth data or asks for more if necessary
 * @param req Request object
 * @param res Response object
 * @returns Promise<void>
 */
export const googleLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('Attempting google login');
    const googlePayload = await authService.verifyGoogleToken(req.body.id_token, req.body.id);

    if (!googlePayload) {
      res.status(401).json({ message: 'Invalid Google ID token' });
      return;
    }

    const existingUser = await userService.getUserByProviderId(googlePayload.sub, 'google');
    if (existingUser) {
      const result = await authService.loginGoogleUser(
        existingUser.username,
        existingUser.email,
        existingUser.googleId!,
      );
      if (!result) {
        res.status(401).json({ message: 'Somehow invalid credentials' });
      }

      logger.info('Matching account found');
      res.status(200).json(result);
    } else {
      logger.info('No matching account found, need more data');
      res.status(202).json({ needsMoreData: true, googlePayload });
    }
  } catch (err: any) {
    res.status(500).json({ message: 'Google login failed', error: err.message });
    logger.error('Google login error', err);
  }
};

/**
 * Creates an account with the data provided, saving the googleId
 * @param req Request object
 * @param res Response object
 * @returns Promise<void>
 */
export const googleRegister = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('Attempting Google register');
    const { userData, ...googleUser } = req.body;
    const googlePayload = await authService.verifyGoogleToken(googleUser.id_token, googleUser.id);

    if (!googlePayload) {
      res.status(401).json({ message: 'Invalid Google ID token' });
      return;
    }

    let user = await userService.getUserByProviderId(googlePayload.sub, 'google');
    if (user) {
      res.status(409).json({ message: 'Google account already linked to an existing user' });
      return;
    }

    user = await userService.getUserByEmail(googlePayload.email!);
    if (user) {
      if (user.googleId) {
        logger.warn(
          `User with email ${googlePayload.email} already has googleId ${user.googleId}, but new payload sub is ${googlePayload.sub}.`,
        );
        res
          .status(409)
          .json({ message: 'Account with this email is already linked to a different Google ID.' });
        return;
      }

      logger.info(`User ${user.email} found, linking Google ID: ${googlePayload.sub}`);
      logger.debug(JSON.stringify(user, null, 2));
      const updatedUser = await userService.addProviderIdToUser(
        user._id as string,
        googlePayload.sub,
        'google',
      );

      if (!updatedUser) {
        logger.error('Could not update user with google id');
        throw new Error('Could not update user with google id');
      }

      const token = genJWT({
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        isAdmin: updatedUser.isAdmin,
      } as JWTPayload);

      const userResponse = updatedUser.toObject();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash: _, ...userDataToReturn } = userResponse;

      res
        .status(200)
        .json({
          user: userDataToReturn,
          token,
          message: 'Google account successfully linked to existing user.',
        });
      logger.info(`Google account linked for existing user: ${updatedUser.email}`);
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
    if (
      err.message.includes('A user already exists with this email') ||
      err.message.includes('A user already exists with this username')
    ) {
      res.status(409).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Google registration failed', error: err.message });
    }
    logger.error('GitHub registration error', err);
  }
};

/**
 * Authenticates a user given its github OAuth data or asks for more if necessary
 * @param req Request object
 * @param res Response object
 * @returns Promise<void>
 */
export const githubLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('Attempting GitHub login');
    const githubPayload = await authService.verifyGithubToken(req.body.accessToken);

    if (!githubPayload) {
      res.status(401).json({ message: 'Invalid GitHub token' });
      return;
    }

    const existingUser = await userService.getUserByProviderId(githubPayload.id, 'github');
    if (existingUser) {
      const result = await authService.loginGithubUser(
        existingUser.username,
        existingUser.email,
        existingUser.githubId!,
      );
      if (!result) {
        res.status(401).json({ message: 'Somehow invalid credentials' });
      }

      logger.info('Matching account found');
      res.status(200).json(result);
    } else {
      logger.info('No matching account found, need more data');
      res.status(202).json({ needsMoreData: true, githubPayload });
    }
  } catch (err: any) {
    res.status(500).json({ message: 'Github login failed', error: err.message });
    logger.error('Github login error', err);
  }
};

/**
 * Creates an account with the data provided, saving the githubId
 * @param req Request object
 * @param res Response object
 * @returns Promise<void>
 */
export const githubRegister = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('Attempting GitHub register');
    const { userData, ...githubUser } = req.body;
    const githubPayload = await authService.verifyGithubToken(githubUser.accessToken);

    if (!githubPayload) {
      res.status(401).json({ message: 'Invalid GitHub accessToken' });
      return;
    }

    const githubEmail = githubUser.email;
    if (!githubEmail) {
      res.status(400).json({ message: 'Email is required for GitHub registration.' });
      return;
    }
    let user = await userService.getUserByProviderId(githubPayload.id, 'github');
    if (user) {
      res.status(409).json({ message: 'GitHub account already linked to an existing user' });
      return;
    }

    user = await userService.getUserByEmail(githubEmail);

    if (user) {
      // User with this email exists, link GitHub ID to this account
      if (user.githubId) {
        logger.warn(
          `User with email ${githubEmail} already has githubId ${user.githubId}, but new payload id is ${githubPayload.id}.`,
        );
        res
          .status(409)
          .json({ message: 'Account with this email is already linked to a different GitHub ID.' });
        return;
      }

      logger.info(`User ${user.email} found, linking GitHub ID: ${githubPayload.id}`);
      const updatedUser = await userService.addProviderIdToUser(
        user._id as string,
        githubPayload.id,
        'github',
      );

      if (!updatedUser) {
        logger.error('Could not update user with github id');
        throw new Error('Could not update user with github id');
      }

      const token = genJWT({
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        isAdmin: updatedUser.isAdmin,
      } as JWTPayload);

      const userResponse = updatedUser.toObject();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash: _, ...userDataToReturn } = userResponse;

      res
        .status(200)
        .json({
          user: userDataToReturn,
          token,
          message: 'GitHub account successfully linked to existing user.',
        });
      logger.info(`GitHub account linked for existing user: ${updatedUser.email}`);
      return;
    }

    const { user: createdUser, token } = await authService.createUser({
      username: userData.username,
      email: githubUser.email,
      role: userData.role,
      autonomousCommunity: userData.autonomousCommunity,
      githubId: githubPayload.id,
    });

    res.status(201).json({ user: createdUser, token });
    logger.info(`New user registered with GitHub: ${createdUser.email}`);
  } catch (err: any) {
    if (
      err.message.includes('A user already exists with this email') ||
      err.message.includes('A user already exists with this username')
    ) {
      res.status(409).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'GitHub registration failed', error: err.message });
    }
    logger.error('GitHub registration error', err);
  }
};
