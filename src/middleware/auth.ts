import jwt, { JwtPayload } from 'jsonwebtoken';
import { expressjwt } from 'express-jwt';
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export interface JWTPayload extends JwtPayload {
  id: string;
  username: string;
  email: string;
  role: string;
  isAdmin: boolean;
  isBlocked: boolean;
}

const allowedPathsForBlockedUsers: string[] = ['/api/users/request-unblock'];

/**
 * Generates a JWT token for the given payload.
 * @param payload Data to include in the token
 * @param expiresIn Time in seconds until the token expires (default: 7 days)
 * @returns JWT token string
 */
export const genJWT = (payload: JWTPayload, expiresIn: number = 604800): string => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', { expiresIn });
};

/**
 * Middleware to authenticate JWT tokens in requests.
 * Extracts the token from Authorization header and verifies it.
 * If valid, adds the user data to the request object.
 */
export const authenticateJWT = () => {
  const jwtMiddleware = expressjwt({
    secret: process.env.JWT_SECRET || 'your-secret-key',
    algorithms: ['HS256'],
    credentialsRequired: true,
    requestProperty: 'auth',
  });

  const checkBLockedStatus = (req: Request, res: Response, next: NextFunction) => {
    if (req.auth) {
      if (req.auth.isBlocked) {
        const isPathAllowed = allowedPathsForBlockedUsers.some(allowedPath => {
          return req.path === allowedPath || req.path.startsWith(`${allowedPath}/`);
        });

        if (!isPathAllowed) {
          logger.warn(
            `Blocked user ID: ${req.auth.id} (${req.auth.username}) attempted to access restricted path: ${req.path}`,
          );
          res.status(403).json({ message: 'Forbidden: Your account is blocked.' });
          return;
        }
      }
    }
    next();
  };

  return [jwtMiddleware, checkBLockedStatus];
};

/**
 * Verifies a JWT token and returns an object with the decoded payload.
 * @param token JWT token string to verify
 * @returns Object containing the decoded payload if the token is valid
 * @throws Error if the token is invalid or verification fails
 */
export const verifyJWT = (token: string) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as JWTPayload;
  } catch (err) {
    throw new Error('Invalid or expired token');
  }
};
