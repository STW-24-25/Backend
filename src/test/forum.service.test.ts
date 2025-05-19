import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Types } from 'mongoose';
import forumService from '../services/forum.service';
import ForumModel, { IForum } from '../models/forum.model';

// No schema needed for this test file

// Mock the logger to avoid logs during tests
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Mock the populate method to avoid User model dependency issues
jest.spyOn(mongoose.Query.prototype, 'populate').mockImplementation(function (this: any) {
  return this;
});

describe('ForumService', () => {
  let mongoServer: MongoMemoryServer;

  // Test data
  const testForumData = {
    title: 'Test Forum',
    description: 'This is a test forum',
    createdBy: new Types.ObjectId().toString(),
  };

  // Completely clear all collections in the database
  const clearDatabase = async (): Promise<void> => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  };

  // Initial setup before all tests
  beforeAll(async () => {
    // Create an in-memory MongoDB instance for testing
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    await mongoose.connect(uri);
    await clearDatabase(); // Ensure the database is clean at the start
  });

  // Clean up before each test to ensure isolation
  beforeEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();
  });

  // Clean up after each test to prevent contamination
  afterEach(async () => {
    await clearDatabase();
  });

  // Close connections after all tests
  afterAll(async () => {
    await clearDatabase(); // Final cleanup
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Helper function to create a test forum directly in the DB
  async function createTestForum(forumData = testForumData): Promise<IForum> {
    const forum = new ForumModel(forumData);
    return await forum.save();
  }

  describe('createForum', () => {
    it('should create a new forum successfully', async () => {
      const forum = await forumService.createForum(testForumData);

      expect(forum).toBeDefined();
      expect(forum.title).toBe(testForumData.title);
      expect(forum.description).toBe(testForumData.description);
      expect(forum.createdBy.toString()).toBe(testForumData.createdBy);

      // Verify forum was saved to DB
      const savedForum = await ForumModel.findById(forum._id);
      expect(savedForum).toBeDefined();
      expect(savedForum!.title).toBe(testForumData.title);
    });

    it('should throw an error if required fields are missing', async () => {
      // Missing title which is required
      const invalidForumData = {
        description: 'This forum has no title',
        createdBy: new Types.ObjectId().toString(),
      };

      await expect(forumService.createForum(invalidForumData as any)).rejects.toThrow();
    });
  });

  describe('updateForum', () => {
    it('should update a forum successfully', async () => {
      const createdForum = await createTestForum();
      // Ensure we have a valid ID string
      const forumId = createdForum._id?.toString() || '';

      const updateData = {
        title: 'Updated Forum Title',
        description: 'Updated forum description',
      };

      const updatedForum = await forumService.updateForum(forumId, updateData);

      expect(updatedForum).toBeDefined();
      expect(updatedForum!.title).toBe(updateData.title);
      expect(updatedForum!.description).toBe(updateData.description);

      // Verify the update was saved to DB
      const savedForum = await ForumModel.findById(forumId);
      expect(savedForum!.title).toBe(updateData.title);
      expect(savedForum!.description).toBe(updateData.description);
    });

    it('should return null if forum not found', async () => {
      const nonExistentId = new Types.ObjectId().toString();
      const updateData = { title: 'This forum does not exist' };

      const result = await forumService.updateForum(nonExistentId, updateData);

      expect(result).toBeNull();
    });
  });

  describe('deleteForum', () => {
    it('should delete a forum successfully', async () => {
      const createdForum = await createTestForum();
      const forumId = createdForum._id?.toString() || '';

      const result = await forumService.deleteForum(forumId);

      expect(result).toBe(true);

      // Verify forum was deleted from DB
      const deletedForum = await ForumModel.findById(forumId);
      expect(deletedForum).toBeNull();
    });

    it('should return false if forum not found', async () => {
      const nonExistentId = new Types.ObjectId().toString();

      const result = await forumService.deleteForum(nonExistentId);

      expect(result).toBe(false);
    });
  });

  describe('findForumById', () => {
    it('should find a forum by ID', async () => {
      const createdForum = await createTestForum();
      const forumId = createdForum._id?.toString() || '';

      const foundForum = await forumService.getForumById(forumId);

      // First verify the forum exists
      expect(foundForum).not.toBeNull();

      // Then do separate assertions - this avoids the conditional expect issue
      // and properly handles the type checking
      expect(foundForum).toBeDefined();

      // Now we can safely access properties
      const forum = foundForum as any;
      expect(forum._id.toString()).toBe(forumId);
      expect(forum.title).toBe(testForumData.title);
    });

    it('should return null if forum not found', async () => {
      const nonExistentId = new Types.ObjectId().toString();

      const result = await forumService.getForumById(nonExistentId);

      expect(result).toBeNull();
    });
  });

  describe('findAllForums', () => {
    beforeEach(async () => {
      // Create multiple test forums
      await createTestForum({
        title: 'Forum 1',
        description: 'First test forum',
        createdBy: new Types.ObjectId().toString(),
      });

      await createTestForum({
        title: 'Forum 2',
        description: 'Second test forum',
        createdBy: new Types.ObjectId().toString(),
      });

      const userId = new Types.ObjectId().toString();
      await createTestForum({
        title: 'User Forum',
        description: 'Forum created by a specific user',
        createdBy: userId,
      });
    });

    it('should find all forums with pagination', async () => {
      const { forums, totalPages } = await forumService.getAllForums(undefined, undefined, 1, 10);

      expect(forums).toHaveLength(3);
      expect(totalPages).toBe(1); // With 3 forums and page size 10, we should have 1 page
    });

    it('should filter forums by title', async () => {
      const { forums } = await forumService.getAllForums('Forum 1');

      expect(forums).toHaveLength(1);
      expect(forums[0].title).toBe('Forum 1');
    });

    it('should filter forums by creator', async () => {
      // Find the user forum first
      const allForums = await ForumModel.find({ title: 'User Forum' });
      const userForum = allForums[0];
      const userId = userForum.createdBy.toString();

      const { forums } = await forumService.getAllForums(undefined, userId);

      expect(forums).toHaveLength(1);
      expect(forums[0].title).toBe('User Forum');
    });

    it('should handle pagination correctly', async () => {
      // Create more forums to test pagination
      for (let i = 3; i <= 12; i++) {
        await createTestForum({
          title: `Forum ${i}`,
          description: `Test forum ${i}`,
          createdBy: new Types.ObjectId().toString(),
        });
      }

      // Get page 1 with size 5
      const page1 = await forumService.getAllForums(undefined, undefined, 1, 5);
      expect(page1.forums).toHaveLength(5);
      expect(page1.totalPages).toBe(3); // With 2 forums and page size 5, we should have 3 pages

      // Get page 2 with size 5
      const page2 = await forumService.getAllForums(undefined, undefined, 2, 5);
      expect(page2.forums).toHaveLength(5);

      // Get page 3 with size 5
      const page3 = await forumService.getAllForums(undefined, undefined, 3, 5);
      expect(page3.forums).toHaveLength(3); // Only 3 forums on the last page
    });
  });

  describe('findForumsByUser', () => {
    let userId: string;

    beforeEach(async () => {
      userId = new Types.ObjectId().toString();

      // Create forums by the user
      await createTestForum({
        title: 'User Forum 1',
        description: 'First forum by user',
        createdBy: userId,
      });

      await createTestForum({
        title: 'User Forum 2',
        description: 'Second forum by user',
        createdBy: userId,
      });

      // Create a forum by another user
      await createTestForum({
        title: 'Another User Forum',
        description: 'Forum by another user',
        createdBy: new Types.ObjectId().toString(),
      });
    });

    it('should find forums created by a specific user', async () => {
      const { forums, totalPages } = await forumService.getForumsByUserId(userId);

      expect(forums).toHaveLength(2);
      expect(totalPages).toBe(1);

      // All forums should be created by the specified user
      forums.forEach(forum => {
        expect(forum.createdBy.toString()).toBe(userId);
      });
    });

    it('should return empty array if user has no forums', async () => {
      const nonExistentUserId = new Types.ObjectId().toString();

      const { forums, totalPages } = await forumService.getForumsByUserId(nonExistentUserId);

      expect(forums).toHaveLength(0);
      expect(totalPages).toBe(0);
    });

    it('should handle pagination correctly', async () => {
      // Create more forums by the user to test pagination
      for (let i = 3; i <= 12; i++) {
        await createTestForum({
          title: `User Forum ${i}`,
          description: `Test forum ${i} by user`,
          createdBy: userId,
        });
      }

      // Get page 1 with size 5
      const page1 = await forumService.getForumsByUserId(userId, 1, 5);
      expect(page1.forums).toHaveLength(5);
      expect(page1.totalPages).toBe(3); // With 12 forums and page size 5, we should have 3 pages

      // Get page 2 with size 5
      const page2 = await forumService.getForumsByUserId(userId, 2, 5);
      expect(page2.forums).toHaveLength(5);

      // Get page 3 with size 5
      const page3 = await forumService.getForumsByUserId(userId, 3, 5);
      expect(page3.forums).toHaveLength(2); // Only 2 forums on the last page
    });
  });

  describe('countForums', () => {
    beforeEach(async () => {
      // Create multiple test forums
      await createTestForum();
      await createTestForum();
      await createTestForum();
    });

    it('should count all forums', async () => {
      const count = await forumService.countForums();

      expect(count).toBe(3);
    });

    it('should count forums with query filter', async () => {
      const specificTitle = 'Specific Title Forum';

      // Create a forum with a specific title
      await createTestForum({
        title: specificTitle,
        description: 'Forum with specific title',
        createdBy: new Types.ObjectId().toString(),
      });

      const count = await forumService.countForums({ title: specificTitle });

      expect(count).toBe(1);
    });
  });

  describe('countForumsByUser', () => {
    let userId: string;

    beforeEach(async () => {
      userId = new Types.ObjectId().toString();

      // Create forums by the user
      await createTestForum({
        title: 'User Forum 1',
        description: 'First forum by user',
        createdBy: userId,
      });

      await createTestForum({
        title: 'User Forum 2',
        description: 'Second forum by user',
        createdBy: userId,
      });

      // Create a forum by another user
      await createTestForum({
        title: 'Another User Forum',
        description: 'Forum by another user',
        createdBy: new Types.ObjectId().toString(),
      });
    });

    it('should count forums created by a specific user', async () => {
      const count = await forumService.countForumsByUser(userId);

      expect(count).toBe(2);
    });

    it('should return 0 if user has no forums', async () => {
      const nonExistentUserId = new Types.ObjectId().toString();

      const count = await forumService.countForumsByUser(nonExistentUserId);

      expect(count).toBe(0);
    });
  });
});
