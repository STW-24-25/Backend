import { MessageModel, IMessage } from '../models/message.model';
import logger from '../utils/logger';

class MessageService {
  async getMessagesByForumId(
    forumId: string,
    page: number,
    size: number,
  ): Promise<{ messages: IMessage[]; totalPages: number }> {
    const totalPages = Math.ceil((await MessageModel.countDocuments({ forum: forumId })) / size);
    const messages = await MessageModel.find({ forum: forumId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * size)
      .limit(size)
      .populate({ path: 'author', select: '-passwordHash -loginHistory -parcels' });
    return { messages: messages as IMessage[], totalPages };
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
