import jwt from 'jsonwebtoken';
import { expressjwt } from 'express-jwt';
import dotenv from 'dotenv';
dotenv.config();
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
