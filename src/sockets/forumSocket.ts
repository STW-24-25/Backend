import { Server } from 'socket.io';
import logger from '../utils/logger';
import { validate } from '../middleware/validator';
import { joinForumSchema, postMessageSchema } from '../middleware/validator/forum.schemas';
import { MessageModel } from '../models/message.model';

function setupForumSockets(io: Server) {
  io.on('connection', socket => {
    logger.info(`A user connected: ${socket.id}`);

    socket.on('disconnect', () => {
      logger.info(`A user disconnected: ${socket.id}`);
    });

    socket.on('joinForum', async (forumId: string) => {
      try {
        await validate(joinForumSchema, { forumId });
        socket.join(forumId);
        logger.info(`User ${socket.id} joined forum ${forumId}`);
      } catch (err) {
        logger.error(`Invalid forumId ${err} from ${socket.id}`);
        socket.emit('error', 'Invalid forumId');
      }
    });

    socket.on('postMessage', async (data: any) => {
      try {
        const validatedData = await validate(postMessageSchema, data);
        const newMessage = new MessageModel(validatedData);
        await newMessage.save();

        io.to(validatedData.forumId).emit('newMessage', {
          ...validatedData,
          createdAt: newMessage.createdAt,
          _id: newMessage._id,
        });
        logger.info(`Message posted in forum ${data.forumId}: ${data.content} by ${data.author}`);
      } catch (err) {
        logger.error(`Invalid message data: ${err} from ${socket.id}`);
        socket.emit('error', 'Invalid message data');
      }
    });
  });
}

export default setupForumSockets;
