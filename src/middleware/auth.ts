import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

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
 * Generates a JWT token for the given payload.
 * @param payload Data to include in the token
 * @param expiresIn Time in seconds until the token expires (default: 7 days)
 * @returns JWT token string
 */
export const genJWT = (payload: object, expiresIn: number = 604800): string => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', { expiresIn });
};

/**
 * Middleware to authenticate JWT tokens in requests.
 * Extracts the token from Authorization header and verifies it.
 * If valid, adds the user data to the request object.
 */
export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    // Get auth header
    const authHeader = req.headers.authorization;

    // Check if header exists and has bearer token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Authorization header missing or invalid' });
      return;
    }

    // Extract token from header
    const token = authHeader.split(' ')[1];

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, decoded: any) => {
      if (err) {
        logger.warn('JWT verification failed', { error: err.message });
        res.status(401).json({ message: 'Invalid or expired token' });
        return;
      }

      // Add user data to request
      req.user = {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role,
        isAdmin: decoded.isAdmin,
      };

      next();
    });
  } catch (error: any) {
    logger.error('Error in authentication middleware', error);
    res.status(500).json({ message: 'Authentication error', error: error.message });
  }
};
