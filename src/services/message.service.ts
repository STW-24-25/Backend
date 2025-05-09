import { MessageModel, IMessage } from '../models/message.model';

class MessageService {
  async getMessagesByForumId(forumId: string): Promise<IMessage | null> {
    return await MessageModel.find({ forumId: forumId }).lean<IMessage>();
  }
}

export default new MessageService();
