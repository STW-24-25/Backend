import { Request, Response } from 'express';
import forumService from '../services/forum.service';
import logger from '../utils/logger';
import messageService from '../services/message.service';

/**
 * Creates a forum and saves it in the DB.
 * @param req Request object already validated.
 * @param res Response object, will have 201 if save was successful or 500 if an error occurred.
 * @returns Promise<void>
 */
export const createForum = async (req: Request, res: Response): Promise<void> => {
  try {
    const forumData = {
      title: req.body.title,
      description: req.body.description,
      createdBy: req.auth!.id,
    };

    const forum = await forumService.createForum(forumData);
    res.status(201).json({ message: 'Forum created successfully', forumId: forum._id });
    logger.info(`Forum created: ${req.body.title}`);
  } catch (err: any) {
    res.status(500).json({ message: 'Error creating forum', error: err.message });
    logger.error('Error creating forum', err);
  }
};

/**
 * Updates an existing forum.
 * @param req Request object containing the forum data to update.
 * @param res Response object, will have 200 if update was successful, 404 if forum not found, or 500 if an error occurred.
 * @returns Promise<void>
 */
export const updateForum = async (req: Request, res: Response): Promise<void> => {
  try {
    const forumId = req.params.id;
    const updateData = req.body;

    const updatedForum = await forumService.updateForum(forumId, updateData);

    if (!updatedForum) {
      res.status(404).json({ message: 'Forum not found' });
      return;
    }

    res.status(200).json({ message: 'Forum updated successfully', forum: updatedForum });
    logger.info(`Forum updated: ${forumId}`);
  } catch (err: any) {
    res.status(500).json({ message: 'Error updating forum', error: err.message });
    logger.error('Error updating forum', err);
  }
};

/**
 * Deletes a forum from the system.
 * @param req Request object containing forum ID to delete.
 * @param res Response object, will have 200 if deletion was successful, 404 if forum not found, or 500 if an error occurred.
 * @returns Promise<void>
 */
export const deleteForum = async (req: Request, res: Response): Promise<void> => {
  try {
    const forumId = req.params.id;
    const deleted = await forumService.deleteForum(forumId);

    if (!deleted) {
      res.status(404).json({ message: 'Forum not found' });
      return;
    }

    res.status(200).json({ message: 'Forum deleted successfully' });
    logger.info(`Forum deleted: ${forumId}`);
  } catch (err: any) {
    res.status(500).json({ message: 'Error deleting forum', error: err.message });
    logger.error('Error deleting forum', err);
  }
};

/**
 * Gets forum information by ID plus its messages paginated.
 * @param req Request object containing the forum ID.
 * @param res Response object, will have 200 if forum is found, 404 if not found, or 500 if an error occurred.
 * @returns Promise<void>
 */
export const getForumById = async (req: Request, res: Response): Promise<void> => {
  try {
    const forumId = req.params.id;
    const forum = await forumService.getForumById(forumId);
    const page = parseInt(req.query.page as string);
    const size = parseInt(req.query.size as string);
    const { messages, totalPages } = await messageService.getMessagesByForumId(forumId, page, size);
    const totalMessages = await messageService.countMessagesByForumId(forumId);

    if (!forum) {
      logger.info(`Forum with id ${forumId} not found`);
      res.status(404).json({ message: 'Forum not found' });
      return;
    }

    res.status(200).json({
      ...forum.toObject(),
      messages,
      page,
      pageSize: size,
      totalMessages,
      totalPages,
    });
    logger.info(`Forum retrieved: ${forumId}`);
  } catch (err: any) {
    res.status(500).json({ message: 'Error retrieving forum', error: err.message });
    logger.error('Error retrieving forum', err);
  }
};

/**
 * Gets all forums with optional pagination and filtering.
 * @param req Request object with optional filtering and pagination parameters.
 * @param res Response object, will have 200 with forums array or 500 if an error occurred.
 * @returns Promise<void>
 */
export const getAllForums = async (req: Request, res: Response): Promise<void> => {
  try {
    const title = req.query.title as string | undefined;
    const createdBy = req.query.createdBy as string | undefined;
    const page = parseInt(req.query.page as string);
    const size = parseInt(req.query.size as string);

    const { forums, totalPages } = await forumService.getAllForums(title, createdBy, page, size);
    const totalForums = await forumService.countForums();

    res.status(200).json({
      forums: forums,
      page: page,
      pageSize: size,
      totalForums: totalForums,
      totalPages: totalPages,
    });
    logger.info(`Retrieved all forums: ${forums.length}`);
  } catch (err: any) {
    res.status(500).json({ message: 'Error retrieving forums', error: err.message });
    logger.error('Error retrieving forums', err);
  }
};

/**
 * Gets forums created by a specific user.
 * @param req Request object containing the user ID.
 * @param res Response object, will have 200 with forums array or 500 if an error occurred.
 * @returns Promise<void>
 */
export const getForumsByUserId = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page as string) || 1;
    const size = parseInt(req.query.size as string) || 10;

    const { forums, totalPages } = await forumService.getForumsByUserId(userId, page, size);
    const totalForums = await forumService.countForumsByUser(userId);

    res.status(200).json({
      forums: forums,
      page: page,
      pageSize: size,
      totalForums: totalForums,
      totalPages: totalPages,
    });
    logger.info(`Retrieved forums for user ${userId}: ${forums.length}`);
  } catch (err: any) {
    res.status(500).json({ message: 'Error retrieving forums by user', error: err.message });
    logger.error('Error retrieving forums by user', err);
  }
};
