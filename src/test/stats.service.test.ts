import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import StatsService from '../services/stats.service';
import UserModel, { AutonomousComunity, UserRole } from '../models/user.model';
import ForumModel from '../models/forum.model';
import MessageModel from '../models/message.model';

describe('StatsService', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await UserModel.deleteMany({});
    await ForumModel.deleteMany({});
    await MessageModel.deleteMany({});
  });

  describe('getAllStats', () => {
    it('should return stats with default values when no data is present', async () => {
      const stats = await StatsService.getAllStats();

      expect(stats).toEqual({
        totalUsers: 0,
        totalBanned: 0,
        totalForums: 0,
        totalPosts: 0,
        postsPerMonth: [],
        usersPerMonth: [],
        usersByAutCom: [],
        usersByRole: [],
        loginsPerMonth: [],
        loginsPerHour: [],
      });
    });

    it('should return stats with populated data', async () => {
      // Insert sample users
      await UserModel.create([
        {
          username: 'user1',
          email: 'user1@example.com',
          passwordHash: 'hash1',
          createdAt: new Date('2025-01-01'),
          role: UserRole.EXPERT,
          autonomousCommunity: AutonomousComunity.ARAGON,
          isAdmin: false,
          isBlocked: false,
          loginHistory: [
            { timestamp: new Date('2025-01-02T10:00:00Z'), ipAddress: '127.0.0.1' },
            { timestamp: new Date('2025-01-02T11:00:00Z'), ipAddress: '127.0.0.1' },
          ],
        },
        {
          username: 'user2',
          email: 'user2@example.com',
          passwordHash: 'hash2',
          createdAt: new Date('2025-01-01'),
          role: UserRole.COOP_PRESIDENT,
          autonomousCommunity: AutonomousComunity.ARAGON,
          isAdmin: false,
          isBlocked: true,
          loginHistory: [{ timestamp: new Date('2025-01-02T10:00:00Z'), ipAddress: '127.0.0.2' }],
        },
      ]);

      // Insert sample forums
      await ForumModel.create([
        {
          title: 'Forum 1',
          description: 'Description 1',
          createdBy: new mongoose.Types.ObjectId(),
        },
        {
          title: 'Forum 2',
          description: 'Description 2',
          createdBy: new mongoose.Types.ObjectId(),
        },
      ]);

      // Insert sample messages
      await MessageModel.create([
        {
          forum: (await ForumModel.findOne({ title: 'Forum 1' }))!._id,
          content: 'This is a test message',
          author: (await UserModel.findOne({ username: 'user1' }))!._id,
          createdAt: new Date('2025-01-01T15:00:00Z'),
          likes: [],
          flags: [],
        },
        {
          forum: (await ForumModel.findOne({ title: 'Forum 2' }))!._id,
          content: 'Another test message',
          author: (await UserModel.findOne({ username: 'user2' }))!._id,
          createdAt: new Date('2025-01-02T16:00:00Z'),
          likes: [],
          flags: [],
        },
      ]);

      const stats = await StatsService.getAllStats();

      expect(stats).toEqual({
        totalUsers: 2,
        totalBanned: 1,
        totalForums: 2,
        totalPosts: 2,
        postsPerMonth: [{ postCount: 2, year: 2025, month: 1 }],
        usersPerMonth: [{ year: 2025, month: 1, userCount: 2 }],
        usersByAutCom: [{ autonomousCommunity: AutonomousComunity.ARAGON, userCount: 2 }],
        usersByRole: [
          { role: UserRole.EXPERT, userCount: 1 },
          { role: UserRole.COOP_PRESIDENT, userCount: 1 },
        ],
        loginsPerMonth: [{ year: 2025, month: 1, userCount: 2 }],
        loginsPerHour: [
          { hour: 10, userCount: 2 },
          { hour: 11, userCount: 1 },
        ],
      });
    });

    it('should handle partial data and return default values for missing stats', async () => {
      // Insert only forums, no users
      await ForumModel.create([
        {
          title: 'Forum 1',
          description: 'Description 1',
          createdBy: new mongoose.Types.ObjectId(),
        },
      ]);

      const stats = await StatsService.getAllStats();

      expect(stats).toEqual({
        totalUsers: 0,
        totalBanned: 0,
        totalForums: 1,
        totalPosts: 0,
        postsPerMonth: [],
        usersPerMonth: [],
        usersByAutCom: [],
        usersByRole: [],
        loginsPerMonth: [],
        loginsPerHour: [],
      });
    });
  });
});
