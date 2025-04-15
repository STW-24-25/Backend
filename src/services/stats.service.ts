import logger from '../utils/logger';
import UserModel from '../models/user.model';
import { ForumModel } from '../models/forum.model';

class StatsService {
  async getAllStats() {
    const runAggregation = async (pipeline: any, desc: string) => {
      try {
        return await UserModel.aggregate(pipeline);
      } catch (err) {
        logger.error(`Error runnign aggregate ${desc}:`, err);
        return [];
      }
    };

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const usersPerMonthPipeline = [
      { $match: { createdAt: { $gte: oneYearAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          uniqueUsers: { $addToSet: '$_id' },
        },
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          userCount: { $size: '$uniqueUsers' },
        },
      },
      { $sort: { year: 1, month: 1 } },
    ];

    const loginsPerMonthPipeline = [
      { $unwind: '$loginHistory' },
      { $match: { 'loginHistory.timestamp': { $gte: oneYearAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$loginHistory.timestamp' },
            month: { $month: '$loginHistory.timestamp' },
          },
          uniqueUsers: { $addToSet: '$_id' },
        },
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          userCount: { $size: '$uniqueUsers' },
        },
      },
      { $sort: { year: 1, month: 1 } },
    ];

    const loginsPerHourPipeline = [
      { $unwind: '$loginHistory' },
      { $match: { 'loginHistory.timestamp': { $gte: oneYearAgo } } },
      {
        $group: {
          _id: {
            hour: { $hour: '$loginHistory.timestamp' },
          },
          uniqueUsers: { $addToSet: '$_id' },
        },
      },
      {
        $project: {
          _id: 0,
          hour: '$_id.hour',
          userCount: { $size: '$uniqueUsers' },
        },
      },
      { $sort: { hour: 1 } },
    ];

    const usersByAutComPipeline = [
      {
        $group: {
          _id: '$autonomousCommunity',
          userCount: { $count: {} },
        },
      },
      {
        $project: {
          _id: 0,
          autonomousCommunity: '$_id',
          userCount: 1,
        },
      },
      { $sort: { autonomousCommunity: 1 } },
    ];

    const usersByRolePipeline = [
      {
        $group: {
          _id: '$role',
          userCount: { $count: {} },
        },
      },
      {
        $project: {
          _id: 0,
          role: '$_id',
          userCount: 1,
        },
      },
      { $sort: { role: 1 } },
    ];

    const stats = {
      totalUsers: await UserModel.countDocuments(),
      // totalPosts: await ...
      totalBanned: await UserModel.countDocuments({ isBlocked: true }),
      totalForums: await ForumModel.countDocuments(),
      usersPerMonth: await runAggregation(usersPerMonthPipeline, 'usersPerMonth'),
      // postsPerMonth: await runAggregation(postsPerMonthPipeline, 'postsPerMonth'),
      usersByAutCom: await runAggregation(usersByAutComPipeline, 'usersByAutCom'),
      usersByRole: await runAggregation(usersByRolePipeline, 'usersByRole'),
      loginsPerMonth: await runAggregation(loginsPerMonthPipeline, 'loginsPerMonth'),
      loginsPerHour: await runAggregation(loginsPerHourPipeline, 'loginsPerHour'),
    };

    return stats;
  }
}

export default new StatsService();
