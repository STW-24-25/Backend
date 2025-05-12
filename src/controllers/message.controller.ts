import { Request, Response } from 'express';
import messageService from '../services/message.service';
import logger from '../utils/logger';

/**
 * Retrieves all messages in the platform, assumes the authenticated user has admin rights
 * @param req The AuthRequest object
 * @param res The response object
 * @returns Promise<void>
 */
export const getAllMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const content = req.query.content as string | undefined;
    const page = parseInt(req.query.page as string) || 1; // Default to page 1
    const size = parseInt(req.query.size as string) || 16; // Default to size 16
    const { messages, totalPages } = await messageService.getAllMessages(content, page, size);
    const totalMessages = await messageService.countMessages();

    res.status(200).json({
      messages: messages,
      page: page,
      pageSize: size,
      totalMessages: totalMessages,
      totalPages: totalPages,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Error getting all messages', error: err.message });
    logger.error('Error getting all messages', err);
  }
};

/**
 * Deletes a message given its id, assumes the authenticated user has admin rights.
 * @param req The AuthRequest object containing the message id as path variable
 * @param res The Response object
 * @returns Promise<void>
 */
export const deleteMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await messageService.deleteMessageById(req.params.id);

    if (!deleted) {
      res.status(404).json({ message: 'Message not found' });
      return;
    }

    res.status(200).json({ message: 'Message deleted successfully' });
    logger.info(`Message deleted: ${req.params.id}`);
  } catch (err: any) {
    res.status(500).json({ message: 'Error deleting message', error: err.message });
    logger.error('Error deleting message', err);
  }
};
