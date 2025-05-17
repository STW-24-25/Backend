import jwt, { JwtPayload } from 'jsonwebtoken';
import { expressjwt } from 'express-jwt';

export interface JWTPayload extends JwtPayload {
  id: string;
  username: string;
  email: string;
  role: string;
  isAdmin: boolean;
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
export const authenticateJWT = () => {
  return expressjwt({
    secret: process.env.JWT_SECRET || 'your-secret-key',
    algorithms: ['HS256'],
    credentialsRequired: true,
    requestProperty: 'auth',
  });
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
