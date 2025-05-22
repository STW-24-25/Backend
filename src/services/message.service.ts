import { Types } from 'mongoose';
import MessageModel, { IMessage } from '../models/message.model';
import logger from '../utils/logger';
import userService from './user.service';
import { AutonomousComunity, UserRole } from '../models/user.model';

class MessageService {
  async getMessagesByForumId(
    forumId: string,
    page: number,
    size: number,
  ): Promise<{ messages: IMessage[]; totalPages: number }> {
    try {
      const query = { forum: forumId, parentMessage: { $exists: false } };

      const totalRootMessages = await MessageModel.countDocuments(query);
      const totalPages = Math.ceil(totalRootMessages / size);

      // Get paginated root messages
      const rootMessages = await MessageModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * size)
        .limit(size)
        .populate({ path: 'author', select: '-passwordHash -loginHistory -parcels' });

      const allForumMessages = await MessageModel.find({
        forum: forumId,
      }).populate({
        path: 'author',
        select: '-passwordHash -loginHistory -parcels',
      });

      // Create a map for faster lookup of children
      const messagesByParentId = new Map<string, IMessage[]>();
      allForumMessages.forEach(msg => {
        if (msg.parentMessage) {
          const parentId = msg.parentMessage.toString();
          if (!messagesByParentId.has(parentId)) {
            messagesByParentId.set(parentId, []);
          }
          messagesByParentId.get(parentId)!.push(msg as IMessage);
        }
      });

      // Sort children by createdAt descending for each parent
      messagesByParentId.forEach(children => {
        children.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      });

      // Function to flatten the message tree in the desired order
      const flattenMessageTree = (messages: IMessage[]): IMessage[] => {
        const result: IMessage[] = [];

        for (const message of messages) {
          result.push(message);

          // Get children for this message
          const children = messagesByParentId.get(message._id.toString()) || [];

          // Recursively add flattened children
          if (children.length > 0) {
            const flattenedChildren = flattenMessageTree(children);
            result.push(...flattenedChildren);
          }
        }

        return result;
      };

      const flatMessages = flattenMessageTree(rootMessages as IMessage[]);

      // Process all user profile images in parallel
      await Promise.all(
        flatMessages.map(async (message: IMessage) => {
          if (message.author && typeof message.author === 'object' && '_id' in message.author) {
            await userService.assignProfilePictureUrl(message.author);
          } else {
            const anonymousAuthor = {
              _id: new Types.ObjectId(),
              username: 'Usuario Eliminado',
              email: 'anonymous@system.com',
              role: UserRole.SMALL_FARMER,
              autonomousCommunity: AutonomousComunity.ARAGON,
              isAdmin: false,
              createdAt: new Date(0),
              isBlocked: false,
              profilePicture: undefined,
            };
            await userService.assignProfilePictureUrl(anonymousAuthor);
            message.author = anonymousAuthor as any;
            message.content = '[Deleted]';
          }
        }),
      );

      logger.info(
        `Found ${flatMessages.length} messages (${rootMessages.length} root messages) for forum ${forumId}`,
      );
      return { messages: flatMessages, totalPages };
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

      await Promise.all(
        messages.map(async (message: IMessage) => {
          if (message.author && typeof message.author === 'object' && '_id' in message.author) {
            await userService.assignProfilePictureUrl(message.author);
          } else {
            const anonymousAuthorData = {
              _id: new Types.ObjectId(),
              username: 'Usuario Eliminado',
              email: 'anonymous@system.com',
              role: UserRole.SMALL_FARMER,
              autonomousCommunity: AutonomousComunity.ARAGON,
              isAdmin: false,
              createdAt: new Date(0),
              isBlocked: false,
              profilePicture: undefined,
            };
            await userService.assignProfilePictureUrl(anonymousAuthorData);
            message.author = anonymousAuthorData as any;
            message.content = '[Deleted]';
          }
        }),
      );

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
