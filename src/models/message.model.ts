import mongoose, { Schema, Document, Types } from 'mongoose';

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
  _id: Types.ObjectId;
  content: string;
  author: Types.ObjectId;
  forum: Types.ObjectId;
  parentMessage?: Types.ObjectId;
  upvotes: Types.ObjectId[];
  isPinned: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>({
  content: { type: String, required: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  forum: { type: Schema.Types.ObjectId, ref: 'Forum', required: true },
  parentMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
  upvotes: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
  isPinned: { type: Boolean, default: false, required: true },
  isDeleted: { type: Boolean, default: false, required: true },
  createdAt: { type: Date, default: Date.now, required: true },
  updatedAt: { type: Date, default: Date.now, required: true },
});

messageSchema.pre<IMessage>(['save', 'updateOne'], function (next) {
  this.updatedAt = new Date();
  next();
});

// Índices para optimizar consultas
messageSchema.index({ forum: 1 });
messageSchema.index({ parentMessage: 1 });
messageSchema.index({ createdAt: -1 });

const MessageModel = mongoose.model<IMessage>('Message', messageSchema);

export default MessageModel;
