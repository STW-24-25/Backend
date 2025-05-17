import { Request, Response } from 'express';
import logger from '../utils/logger';
import statsService from '../services/stats.service';

/**
 * Retrieves all stats and handles http responses to the client
 * @param req Validated Request object (empty)
 * @param res Response object, either 200 if stats were retrieved succesfully or 500 otherwise
 */
export const getAllStats = async (_: Request, res: Response): Promise<void> => {
  try {
    const stats = await statsService.getAllStats();

    res.status(200).json(stats);
    logger.info('Retrieved all stats');
  } catch (err: any) {
    res.status(500).json({ message: 'Error retrieving all stats', error: err.message });
    logger.error('Error retrieving all stats', err);
  }
};
