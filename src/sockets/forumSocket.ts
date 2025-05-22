import { Server } from 'socket.io';
import logger from '../utils/logger';
import { validate } from '../middleware/validator';
import {
  deleteMessageSchema,
  joinForumSchema,
  postMessageSchema,
  editMessageSchema,
} from '../middleware/validator/forum.schemas';
import MessageModel from '../models/message.model';
import { JWTPayload, verifyJWT } from '../middleware/auth';
import messageService from '../services/message.service';
import userService from '../services/user.service';
import ForumModel from '../models/forum.model';

const ADMIN_UPDATES_ROOM = 'admin_all_messages_feed';

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

        const res = await ForumModel.findById(forum);
        if (!res) {
          throw new Error('Forum not found');
        }

        // Room has id of the forum
        socket.join(forum);
        socket.emit('joinedForum');
        logger.info(`User ${socket.id} joined forum ${forum}`);
      } catch (err) {
        logger.error(`Invalid forumId ${err} from ${socket.id}`);
        socket.emit('error', 'Invalid forum id');
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
          const decodedToken = verifyJWT(data.token) as JWTPayload;

          // Check the author is the authenticated user
          if (decodedToken.id !== validatedData.author) {
            logger.warn(
              `Author mismatch: Payload author ${validatedData.author} doesn't match authenticated user ${decodedToken.id} from ${socket.id} `,
            );
            socket.emit('error', 'Author ID does not match authenticated user ID');
          }

          const newMessage = await MessageModel.create(validatedData);
          await newMessage.save();

          const populatedNewMsg = await MessageModel.findById(newMessage._id).populate([
            'author',
            'forum',
          ]);

          await userService.assignProfilePictureUrl(populatedNewMsg!.author);

          io.to(ADMIN_UPDATES_ROOM).emit('newMessage', populatedNewMsg);
          io.to(validatedData.forum).emit('newMessage', {
            ...populatedNewMsg!.toObject(),
            forum: populatedNewMsg!.forum._id,
          });
          logger.info(`Message posted in forum ${data.forum}: ${data.content} by ${data.author}`);
        } catch (err) {
          logger.error(`Error posting message: ${err} from ${socket.id}`);
          socket.emit('error', 'Error posting message');
        }
      },
    );

    socket.on(
      'editMessage',
      async (data: { messageId: string; content: string; token: string }) => {
        try {
          const validatedData = await validate(editMessageSchema, data);
          const decodedToken = verifyJWT(data.token) as JWTPayload;
          const originalMsg = await MessageModel.findById(validatedData.messageId);
          logger.debug('originalMsg: ', originalMsg?.toObject());

          if (!originalMsg) {
            logger.warn(
              `Message with id ${validatedData.messageId} not found. Attempt by ${socket.id}`,
            );
            socket.emit('error', 'Message not found');
            return;
          }

          if (originalMsg.isDeleted) {
            logger.warn(
              `Attempt to edit deleted message ${validatedData.messageId} by ${socket.id}`,
            );
            socket.emit('error', 'Cannot edit deleted messages');
            return;
          }

          const authorId =
            typeof originalMsg.author === 'string'
              ? originalMsg.author
              : originalMsg.author.toString();

          if (decodedToken.id !== authorId && !decodedToken.isAdmin) {
            logger.warn(
              `User ${decodedToken.id} (${socket.id}) attempted to edit message ${validatedData.messageId} owned by ${authorId} without admin rights.`,
            );
            socket.emit('error', 'Unauthorized to edit this message');
            return;
          }
          logger.debug('validatedData: ', validatedData);
          const updatedMsg = await MessageModel.findByIdAndUpdate(
            validatedData.messageId,
            { content: validatedData.content },
            { new: true },
          ).populate(['author', 'forum']);

          logger.debug('updatedMsg: ', updatedMsg?.toObject());

          await userService.assignProfilePictureUrl(updatedMsg!.author);

          io.to(ADMIN_UPDATES_ROOM).emit('messageEdited', updatedMsg);
          io.to(updatedMsg!.forum._id.toString()).emit('messageEdited', {
            ...updatedMsg!.toObject(),
            forum: updatedMsg!.forum._id,
          });

          logger.info(
            `Message ${validatedData.messageId} edited by ${decodedToken.id} (${socket.id})`,
          );
        } catch (err) {
          logger.error(`Error editing message: ${err} from ${socket.id}`);
          socket.emit('error', 'Error editing message');
        }
      },
    );

    socket.on('deleteMessage', async (messageId: string, token: string) => {
      try {
        await validate(deleteMessageSchema, { messageId, token });
        const decodedToken = verifyJWT(token) as JWTPayload;
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
        io.to(ADMIN_UPDATES_ROOM).emit('messageDeleted', messageId);
        logger.info(`Message ${messageId} deleted by user ${decodedToken.id} (${socket.id})`);
      } catch (err) {
        logger.error(`Error deleting message ${messageId}: ${err} from ${socket.id}`);
        socket.emit('error', 'Error deleting message');
      }
    });

    socket.on('joinAdminFeed', async (token: string) => {
      try {
        const decodedToken = verifyJWT(token) as JWTPayload;
        if (decodedToken && decodedToken.isAdmin) {
          socket.join(ADMIN_UPDATES_ROOM);
          socket.emit('adminFeedJoined', 'Succesfully joined admin feed');
          logger.info(`Admin user ${decodedToken.id} (${socket.id}) joined the admin updates feed`);

          const { messages } = await messageService.getAllMessages(undefined, 1, 1000);
          socket.emit('adminInitialMessages', messages);
        } else {
          logger.warn(`User ${socket.id} attempted to join admin feed without admin rights.`);
          socket.emit('error', 'Unauthorized to join admin feed.');
        }
      } catch (err) {
        logger.error(`Error joining admin feed for ${socket.id}: ${err}`);
        socket.emit('error', 'Error joining admin feed and fetching messages');
      }
    });
  });
}

export default setupForumSockets;
