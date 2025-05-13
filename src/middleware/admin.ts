import { NextFunction, Request, Response } from 'express';
import logger from '../utils/logger';

/**
 * Middleware factory that returns a function to check if the authenticated user is an admin.
 * @returns Express middleware function
 */
export const isAdmin = () => (req: Request, res: Response, next: NextFunction) => {
  if (!req.auth) {
    logger.warn('Admin check failed: No authentication data found');
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  if (req.auth.isAdmin === true) {
    logger.info(`Admin access granted for user ID: ${req.auth.id} (${req.auth.username})`);
    next();
  } else {
    logger.warn(`Admin access denied for user ID: ${req.auth.id} (${req.auth.username})`);
    res.status(403).json({ message: 'Forbidden: Admin access required' });
    return;
  }
};
