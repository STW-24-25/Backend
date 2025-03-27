import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '../logger';

/**
 * Handler for zod validation errors.
 * @param err The error produced.
 * @param _req Request object, unused.
 * @param res Response object.
 * @param next Next function to call.
 */
const zodErorrHandler = async (err: any, _req: Request, res: Response, next: NextFunction) => {
  logger.error(err);

  if (!(err instanceof ZodError)) {
    return next(err);
  }

  res.status(400).json({ message: 'Validation error', errors: err.errors });
};

export default zodErorrHandler;
