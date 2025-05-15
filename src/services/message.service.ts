import { MessageModel, IMessage } from '../models/message.model';
import logger from '../utils/logger';

class MessageService {
  async getMessagesByForumId(
    forumId: string,
    page: number,
    size: number,
  ): Promise<{ messages: IMessage[]; totalPages: number }> {
    try {
      // Only get root messages (those without a parent)
      const rootMessagesQuery = { forum: forumId, parent: { $exists: false } };

      const totalRootMessages = await MessageModel.countDocuments(rootMessagesQuery);
      const totalPages = Math.ceil(totalRootMessages / size);

      // Get paginated root messages
      const rootMessages = await MessageModel.find(rootMessagesQuery)
        .sort({ createdAt: -1 })
        .skip((page - 1) * size)
        .limit(size)
        .populate({ path: 'author', select: '-passwordHash -loginHistory -parcels' });

      // For each root message, fetch all its descendants recursively
      const messages = [];
      for (const rootMessage of rootMessages) {
        messages.push(rootMessage);

        // Get all child messages for this root message
        const childMessages = await MessageModel.find({ forum: forumId, parent: rootMessage._id })
          .sort({ createdAt: -1 })
          .populate({ path: 'author', select: '-passwordHash -loginHistory -parcels' });

        messages.push(...childMessages);
      }

      logger.info(
        `Found ${messages.length} messages (${rootMessages.length} root messages) for forum ${forumId}`,
      );
      return { messages: messages as IMessage[], totalPages };
    } catch (err) {
      logger.error(`Error retrieving messages for forum ${forumId}: ${err}`);
      throw err;
    }
  }

  async getAllMessages(
    content: string | undefined,
    page: number,
    size: number,
  ): Promise<{ messages: IMessage[]; totalPages: number }> {
    try {
      const query: any = { isDeleted: { $ne: true } };
      if (content) {
        query.content = { $regex: content, $options: 'i' };
      }

      const totalPages = Math.ceil((await MessageModel.countDocuments(query)) / size);
      const messages = await MessageModel.find(query)
        .sort({ createdAt: -1 }) // Sort by createdAt in descending order
        .skip((page - 1) * size)
        .limit(size)
        .populate(['author', 'forum'])
        .exec();

      logger.info(`Found ${messages.length} messages`);
      return { messages: messages as IMessage[], totalPages };
    } catch (err) {
      logger.error(`Error retrieving all messages: ${err}`);
      throw err;
    }
  }

  async countMessages(): Promise<number> {
    try {
      const count = await MessageModel.countDocuments();
      logger.info(`Total messages count: ${count}`);
      return count;
    } catch (err) {
      logger.error(`Error counting messages: ${err}`);
      throw err;
    }
  }

  async countMessagesByForumId(forumId: string): Promise<number> {
    try {
      const count = await MessageModel.countDocuments({ forum: forumId });
      logger.info(`Total messages count for forum ${forumId}: ${count}`);
      return count;
    } catch (err) {
      logger.error(`Error counting messages for forum ${forumId}: ${err}`);
      throw err;
    }
  }

  async deleteMessageById(messageId: string): Promise<boolean | null> {
    return await MessageModel.findByIdAndDelete(messageId);
  }
}

export default new MessageService();
