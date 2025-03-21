import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'UnaBuenaClave';

export const generateToken = (payload: object, expiresIn: number = 604800): string => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

export const verifyToken = (token: string): boolean => {
    try {
        jwt.verify(token, JWT_SECRET);
        return true;
    } catch(err) {
        return false;
    };
};
