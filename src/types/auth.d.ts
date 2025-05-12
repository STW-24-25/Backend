import { Request } from 'express';

export interface AuthPayload {
  id: string;
  username: string;
  email: string;
  role: string;
  isAdmin: boolean;
}

export type AuthRequest = Request & { auth: AuthPayload };
