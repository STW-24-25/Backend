import mongoose, { Schema, Document, Types } from 'mongoose';
import type { IUser } from './user.model';

/**
 * @swagger
 * components:
 *  schemas:
 *    Forum:
 *      type: object
 *      required:
 *        - title
 *        - description
 *        - createdBy
 *        - createdAt
 *        - updatedAt
 *      properties:
 *        title:
 *          type: string
 *        description:
 *          type: string
 *        createdBy:
 *          $ref: '#/components/schemas/User'
 *        createdAt:
 *          type: string
 *          format: date-time
 *        updatedAt:
 *          type: string
 *          format: date-time
 */
export interface IForum extends Document {
  title: string;
  description: string;
  createdBy: Types.ObjectId | IUser;
  createdAt: Date;
  updatedAt: Date;
}

const forumSchema = new Schema<IForum>({
  title: { type: String, required: true },
  description: String,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

forumSchema.pre<IForum>(['save', 'updateOne'], function (next) {
  this.updatedAt = new Date();
  next();
});

const ForumModel = mongoose.model<IForum>('Forum', forumSchema);

export default ForumModel;
