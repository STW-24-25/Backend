import { MessageModel, IMessage } from '../models/message.model';
import logger from '../utils/logger';

class MessageService {
  async getMessagesByForumId(forumId: string): Promise<IMessage | null> {
    return await MessageModel.find({ forumId: forumId }).lean<IMessage>();
  }

  async getAllMessages(
    content: string | undefined,
    page: number,
    size: number,
  ): Promise<{ messages: IMessage[]; totalPages: number }> {
    try {
      const query: any = {};
      if (content) {
        query.content = { $regex: content, $options: 'i' };
      }

      const totalPages = Math.ceil((await MessageModel.countDocuments(query)) / size);
      const messages = await MessageModel.find(query)
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

  async deleteMessageById(messageId: string): Promise<boolean | null> {
    return await MessageModel.findByIdAndDelete(messageId);
  }
}

export default new MessageService();
