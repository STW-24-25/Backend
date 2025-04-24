import mongoose, { Schema, Document, Types } from 'mongoose';
import type { IUser } from './user.model';
import { IForum } from './forum.model';

/**
 * @swagger
 * components:
 *  schemas:
 *    Message:
 *      type: object
 *      required:
 *        - content
 *        - author
 *        - forum
 *        - createdAt
 *        - updatedAt
 *      properties:
 *        content:
 *          type: string
 *        author:
 *          type: string
 *          format: MongoId
 *        forumId:
 *          type: string
 *          format: MongoId
 *        parentMessage:
 *          type: string
 *          format: MongoId
 *        upvotes:
 *          type: array
 *          items:
 *            type: string
 *            format: MongoId
 *        isPinned:
 *          type: boolean
 *        createdAt:
 *          type: string
 *          format: date-time
 *        updatedAt:
 *          type: string
 *          format: date-time
 */
export interface IMessage extends Document {
  content: string;
  author: Types.ObjectId | IUser;
  forumId: Types.ObjectId | IForum;
  parentMessage?: Types.ObjectId | IMessage;
  upvotes: Types.ObjectId[];
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>({
  content: { type: String, required: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  forumId: { type: Schema.Types.ObjectId, ref: 'Forum', required: true },
  parentMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
  upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  isPinned: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

messageSchema.pre<IMessage>(['save', 'updateOne'], function (next) {
  this.updatedAt = new Date();
  next();
});

// Índices para optimizar consultas
messageSchema.index({ forum: 1 });
messageSchema.index({ parentMessage: 1 });
messageSchema.index({ createdAt: -1 });

export const MessageModel = mongoose.model<IMessage>('Message', messageSchema);
