import { Request } from 'express';

export type AuthRequest = Request & {
  auth?: {
    id?: string;
    username?: string;
    email?: string;
    role?: string;
    isAdmin?: boolean;
  };
};
