import { Server } from 'socket.io';
import logger from '../utils/logger';
import { validate } from '../middleware/validator';
import {
  deleteMessageSchema,
  joinForumSchema,
  postMessageSchema,
} from '../middleware/validator/forum.schemas';
import { MessageModel } from '../models/message.model';
import { verifyJWT } from '../middleware/auth';

function setupForumSockets(io: Server) {
  io.on('connection', socket => {
    logger.info(`A user connected: ${socket.id}`);

    socket.on('disconnect', () => {
      logger.info(`A user disconnected: ${socket.id}`);
    });

    socket.on('joinForum', async (forum: string, token: string) => {
      try {
        await validate(joinForumSchema, { forum, token });
        verifyJWT(token);

        // Room has id of the forum
        socket.join(forum);
        logger.info(`User ${socket.id} joined forum ${forum}`);

        const messages = await MessageModel.find({ forum: forum })
          .sort({ createdAt: 1 })
          .populate('author');
        socket.emit('messageHistory', messages);
      } catch (err) {
        logger.error(`Invalid forumId ${err} from ${socket.id}`);
        socket.emit('error', 'Invalid forumId');
      }
    });

    socket.on(
      'postMessage',
      async (data: {
        content: string;
        author: string;
        forum: string;
        parentMessage?: string;
        token: string;
      }) => {
        try {
          const validatedData = await validate(postMessageSchema, data);
          const decodedToken = verifyJWT(data.token);

          // Check the author is the authenticated user
          if (decodedToken.id !== validatedData.author) {
            logger.warn(
              `Author mismatch: Payload author ${validatedData.author} doesn't match authenticated user ${decodedToken.id} from ${socket.id} `,
            );
            socket.emit('error', 'Author ID does not match authenticated user ID');
          }

          const newMessage = new MessageModel(validatedData);
          await newMessage.save();

          const populatedNewMessage = await MessageModel.findById(newMessage._id).populate(
            'author',
          );

          io.to(validatedData.forum).emit('newMessage', populatedNewMessage);
          logger.info(`Message posted in forum ${data.forum}: ${data.content} by ${data.author}`);
        } catch (err) {
          logger.error(`Error posting message: ${err} from ${socket.id}`);
          socket.emit('error', 'Error posting message');
        }
      },
    );

    socket.on('deleteMessage', async (messageId: string, token: string) => {
      try {
        await validate(deleteMessageSchema, { messageId, token });
        const decodedToken = verifyJWT(token);
        const msg = await MessageModel.findById(messageId);

        if (!msg) {
          logger.warn(`Message with id ${messageId} not found. Attempt by ${socket.id}`);
          socket.emit('error', 'Message not found');
          return;
        }

        const authorId = typeof msg.author === 'string' ? msg.author : msg.author.toString();

        if (decodedToken.id !== authorId && !decodedToken.isAdmin) {
          logger.warn(
            `User ${decodedToken.id} (${socket.id}) attempted to delete message ${messageId} owned by ${authorId} without admin rights.`,
          );
          socket.emit('error', 'Unauthorized to delete this message');
          return;
        }

        await MessageModel.findByIdAndUpdate(messageId, { isDeleted: true });
        io.to(msg.forum.toString()).emit('messageDeleted', messageId);
        logger.info(`Message ${messageId} deleted by user ${decodedToken.id} (${socket.id})`);
      } catch (err) {
        logger.error(`Error deleting message ${messageId}: ${err} from ${socket.id}`);
        socket.emit('error', 'Error deleting message');
      }
    });
  });
}

export default setupForumSockets;
