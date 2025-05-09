import { Server } from 'socket.io';
import logger from '../utils/logger';
import { validate } from '../middleware/validator';
import { joinForumSchema, postMessageSchema } from '../middleware/validator/forum.schemas';
import { MessageModel } from '../models/message.model';
import { verifyJWT } from '../middleware/auth';

function setupForumSockets(io: Server) {
  io.on('connection', socket => {
    logger.info(`A user connected: ${socket.id}`);

    socket.on('disconnect', () => {
      logger.info(`A user disconnected: ${socket.id}`);
    });

    socket.on('joinForum', async (forumId: string, token: string) => {
      try {
        await validate(joinForumSchema, { forumId, token });
        verifyJWT(token); // only verify it's valid, no need for user id check

        socket.join(forumId);
        logger.info(`User ${socket.id} joined forum ${forumId}`);
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
        forumId: string;
        parentMessage?: string;
        token: string;
      }) => {
        try {
          const validatedData = await validate(postMessageSchema, data);
          const decodedToken = verifyJWT(data.token);

          const userIdFromToken = decodedToken.id;

          // Check the author is the authenticated user
          if (userIdFromToken !== validatedData.author) {
            logger.warn(
              `Author mismatch: Payload author ${validatedData.author} doesn't match authenticated user ${userIdFromToken} from ${socket.id} `,
            );
            socket.emit('error', 'Author ID does not match authenticated user ID');
          }

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
      },
    );
  });
}

export default setupForumSockets;
