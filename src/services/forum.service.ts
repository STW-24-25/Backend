import { Types } from 'mongoose';
import ForumModel, { IForum } from '../models/forum.model';

interface ForumData {
  title: string;
  description?: string;
  createdBy: string | Types.ObjectId;
}

interface ForumQueryResult {
  forums: IForum[];
  totalPages: number;
}

class ForumService {
  /**
   * Creates a new forum in the database.
   * @param forumData Forum data to save.
   * @returns Promise with the created forum.
   */
  async createForum(forumData: ForumData): Promise<IForum> {
    const forum = new ForumModel(forumData);
    return await forum.save();
  }

  /**
   * Updates an existing forum.
   * @param forumId ID of the forum to update.
   * @param updateData Data to update.
   * @returns Promise with the updated forum or null if not found.
   */
  async updateForum(forumId: string, updateData: Partial<ForumData>): Promise<IForum | null> {
    return await ForumModel.findByIdAndUpdate(
      forumId,
      { ...updateData, updatedAt: new Date() },
      { new: true },
    );
  }

  /**
   * Deletes a forum from the database.
   * @param forumId ID of the forum to delete.
   * @returns Promise with true if deleted, false if not found.
   */
  async deleteForum(forumId: string): Promise<boolean> {
    const result = await ForumModel.findByIdAndDelete(forumId);
    return result !== null;
  }

  /**
   * Finds a forum by its ID.
   * @param forumId ID of the forum to find.
   * @returns Promise with the forum or null if not found.
   */
  async getForumById(forumId: string): Promise<IForum | null> {
    return await ForumModel.findById(forumId);
  }

  /**
   * Finds all forums with optional filtering and pagination.
   * @param title Optional title filter.
   * @param createdBy Optional creator user ID filter.
   * @param page Page number for pagination.
   * @param size Number of items per page.
   * @returns Promise with forums and pagination info.
   */
  async getAllForums(
    title?: string,
    createdBy?: string,
    page: number = 1,
    size: number = 10,
  ): Promise<ForumQueryResult> {
    const query: any = {};

    if (title) {
      query.title = { $regex: title, $options: 'i' };
    }

    if (createdBy) {
      query.createdBy = createdBy;
    }

    const skip = (page - 1) * size;

    const forums = await ForumModel.find(query)
      .populate('createdBy', 'username email profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(size);

    const totalForums = await this.countForums(query);
    const totalPages = Math.ceil(totalForums / size);

    return { forums, totalPages };
  }

  /**
   * Finds forums created by a specific user.
   * @param userId ID of the user.
   * @param page Page number for pagination.
   * @param size Number of items per page.
   * @returns Promise with forums and pagination info.
   */
  async getForumsByUserId(
    userId: string,
    page: number = 1,
    size: number = 10,
  ): Promise<ForumQueryResult> {
    const query = { createdBy: userId };
    const skip = (page - 1) * size;

    const forums = await ForumModel.find(query)
      .populate('createdBy', 'username email profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(size);

    const totalForums = await this.countForumsByUser(userId);
    const totalPages = Math.ceil(totalForums / size);

    return { forums, totalPages };
  }

  /**
   * Counts the total number of forums with optional filtering.
   * @param query Optional query filter.
   * @returns Promise with the count.
   */
  async countForums(query = {}): Promise<number> {
    return await ForumModel.countDocuments(query);
  }

  /**
   * Counts forums created by a specific user.
   * @param userId ID of the user.
   * @returns Promise with the count.
   */
  async countForumsByUser(userId: string): Promise<number> {
    return await ForumModel.countDocuments({ createdBy: userId });
  }
}

export default new ForumService();
