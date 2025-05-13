import { Request, Response, NextFunction } from 'express';
import { S3_CONFIG } from '../config/s3.config';
import logger from '../utils/logger';

/**
 * Middleware to validate image uploads
 */
export const validateImage = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const { mimetype, size } = req.file;

    // Check file type
    if (
      !S3_CONFIG.ALLOWED_MIME_TYPES.includes(
        mimetype as (typeof S3_CONFIG.ALLOWED_MIME_TYPES)[number],
      )
    ) {
      res.status(400).json({
        message: `Invalid file type. Allowed types: ${S3_CONFIG.ALLOWED_MIME_TYPES.join(', ')}`,
      });
      return;
    }

    // Check file size
    if (size > S3_CONFIG.MAX_FILE_SIZE) {
      res.status(400).json({
        message: `File too large. Maximum size: ${S3_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`,
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Error validating image:', error);
    res.status(500).json({ message: 'Error validating image' });
  }
};
