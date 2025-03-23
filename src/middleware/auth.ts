import { expressjwt } from 'express-jwt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'UnaBuenaClave';

export const genJWT = (payload: object, expiresIn: number = 604800): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

export const verifyJWT = () => {
  return expressjwt({
    secret: JWT_SECRET,
    algorithms: ['HS256'],
    credentialsRequired: true,
    requestProperty: 'auth',
  });
};
