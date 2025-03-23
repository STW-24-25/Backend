import { Request, Response, NextFunction } from 'express';
import { z, AnyZodObject } from 'zod';
import logger from '../../utils/logger';

export const validateSchema = (schema: AnyZodObject) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body, query, params } = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      req.body = body;
      req.query = query;
      req.params = params;

      return next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        logger.warn('Validation error', {
          errors: err.errors,
          path: req.path,
          method: req.method,
          body: req.body,
          query: req.query,
          params: req.params,
        });
      }
      return next(err);
    }
  };
