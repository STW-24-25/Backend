import { AuthPayload } from './auth';

declare global {
  namespace Express {
    export interface Request {
      auth: AuthPayload;
    }
  }
}

export {};
