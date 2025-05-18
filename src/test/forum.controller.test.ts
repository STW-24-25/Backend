import { Request, Response } from 'express';
import * as forumController from '../controllers/forum.controller';
import forumService from '../services/forum.service';
import { Types } from 'mongoose';
import messageService from '../services/message.service';
import { UserRole } from '../models/user.model';

// Mock the forum service
jest.mock('../services/forum.service', () => ({
  createForum: jest.fn(),
  updateForum: jest.fn(),
  deleteForum: jest.fn(),
  getForumById: jest.fn(),
  getAllForums: jest.fn(),
  getForumsByUserId: jest.fn(),
  countForums: jest.fn(),
  countForumsByUser: jest.fn(),
}));

jest.mock('../services/message.service', () => ({
  getMessagesByForumId: jest.fn(),
  countMessagesByForumId: jest.fn(),
}));

// Mock the logger
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('Forum Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject: any;

  // Setup before each test
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock response with json and status methods
    responseObject = {};
    mockResponse = {
      json: jest.fn().mockImplementation(result => {
        responseObject = result;
        return mockResponse;
      }),
      status: jest.fn().mockImplementation(statusCode => {
        responseObject.statusCode = statusCode;
        return mockResponse;
      }),
    };
  });

  // Test data
  const mockForumId = new Types.ObjectId().toString();
  const mockUserId = new Types.ObjectId().toString();

  const mockForumData = {
    title: 'Test Forum',
    description: 'Test Description',
    createdBy: mockUserId,
  };

  const mockForumResponse = {
    _id: mockForumId,
    ...mockForumData,
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: [],
  };

  const mockAuthData = {
    id: mockUserId,
    username: 'Test username',
    email: 'Test email',
    role: UserRole.EXPERT,
    isAdmin: false,
    isBlocked: false,
  };

  describe('createForum', () => {
    it('should create a forum and return 201 status', async () => {
      // Arrange
      mockRequest = {
        body: mockForumData,
        auth: mockAuthData,
      };

      (forumService.createForum as jest.Mock).mockResolvedValue(mockForumResponse);

      // Act
      await forumController.createForum(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(forumService.createForum).toHaveBeenCalledWith(mockForumData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Forum created successfully',
        forumId: mockForumId,
      });
    });

    it('should return 500 status when forum creation fails', async () => {
      // Arrange
      mockRequest = {
        body: mockForumData,
        auth: mockAuthData,
      };

      const errorMessage = 'Database error';
      (forumService.createForum as jest.Mock).mockRejectedValue(new Error(errorMessage));

      // Act
      await forumController.createForum(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(forumService.createForum).toHaveBeenCalledWith(mockForumData);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Error creating forum',
        error: errorMessage,
      });
    });
  });

  describe('updateForum', () => {
    it('should update a forum and return 200 status', async () => {
      // Arrange
      const updateData = { title: 'Updated Forum Title' };
      mockRequest = {
        params: { id: mockForumId },
        body: updateData,
      };

      const updatedForum = { ...mockForumResponse, ...updateData };
      (forumService.updateForum as jest.Mock).mockResolvedValue(updatedForum);

      // Act
      await forumController.updateForum(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(forumService.updateForum).toHaveBeenCalledWith(mockForumId, updateData);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Forum updated successfully',
        forum: updatedForum,
      });
    });

    it('should return 404 status when forum not found', async () => {
      // Arrange
      mockRequest = {
        params: { id: mockForumId },
        body: { title: 'Updated Forum Title' },
      };

      (forumService.updateForum as jest.Mock).mockResolvedValue(null);

      // Act
      await forumController.updateForum(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Forum not found',
      });
    });

    it('should return 500 status when update fails', async () => {
      // Arrange
      mockRequest = {
        params: { id: mockForumId },
        body: { title: 'Updated Forum Title' },
      };

      const errorMessage = 'Database error';
      (forumService.updateForum as jest.Mock).mockRejectedValue(new Error(errorMessage));

      // Act
      await forumController.updateForum(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Error updating forum',
        error: errorMessage,
      });
    });
  });

  describe('deleteForum', () => {
    it('should delete a forum and return 200 status', async () => {
      // Arrange
      mockRequest = {
        params: { id: mockForumId },
      };

      (forumService.deleteForum as jest.Mock).mockResolvedValue(true);

      // Act
      await forumController.deleteForum(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(forumService.deleteForum).toHaveBeenCalledWith(mockForumId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Forum deleted successfully',
      });
    });

    it('should return 404 status when forum not found', async () => {
      // Arrange
      mockRequest = {
        params: { id: mockForumId },
      };

      (forumService.deleteForum as jest.Mock).mockResolvedValue(false);

      // Act
      await forumController.deleteForum(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Forum not found',
      });
    });

    it('should return 500 status when delete fails', async () => {
      // Arrange
      mockRequest = {
        params: { id: mockForumId },
      };

      const errorMessage = 'Database error';
      (forumService.deleteForum as jest.Mock).mockRejectedValue(new Error(errorMessage));

      // Act
      await forumController.deleteForum(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Error deleting forum',
        error: errorMessage,
      });
    });
  });

  describe('getForumById', () => {
    it('should get a forum and return 200 status', async () => {
      // Arrange
      mockRequest = {
        params: { id: mockForumId },
        query: { page: '1', size: '10' },
      };
      const mockMessages: any[] = [];

      const mockForumDocument = {
        ...mockForumResponse, // Spread the plain data
        toObject: () => mockForumResponse, // Add the mock toObject method
      };

      (forumService.getForumById as jest.Mock).mockResolvedValue(mockForumDocument);
      (messageService.getMessagesByForumId as jest.Mock).mockResolvedValue({
        messages: mockMessages,
        totalPages: 1,
      });
      (messageService.countMessagesByForumId as jest.Mock).mockResolvedValue(0);

      // Act
      await forumController.getForumById(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(forumService.getForumById).toHaveBeenCalledWith(mockForumId);
      expect(messageService.getMessagesByForumId).toHaveBeenCalledWith(mockForumId, 1, 10);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ...mockForumResponse,
        messages: mockMessages,
        page: 1,
        pageSize: 10,
        totalMessages: 0,
        totalPages: 1,
      });
    });

    it('should return 404 status when forum not found', async () => {
      // Arrange
      mockRequest = {
        params: { id: mockForumId },
        query: { page: '1', size: '10' },
      };
      (forumService.getForumById as jest.Mock).mockResolvedValue(null);

      // Act
      await forumController.getForumById(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Forum not found',
      });
    });

    it('should return 500 status when retrieval fails', async () => {
      // Arrange
      mockRequest = {
        params: { id: mockForumId },
        query: { page: '1', size: '10' },
      };

      const errorMessage = 'Database error';
      (forumService.getForumById as jest.Mock).mockRejectedValue(new Error(errorMessage));

      // Act
      await forumController.getForumById(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Error retrieving forum',
        error: errorMessage,
      });
    });
  });

  describe('getAllForums', () => {
    it('should get all forums with pagination and return 200 status', async () => {
      // Arrange
      mockRequest = {
        query: {
          page: '1',
          size: '10',
        },
      };

      const mockForums = [
        mockForumResponse,
        { ...mockForumResponse, _id: new Types.ObjectId().toString() },
      ];
      (forumService.getAllForums as jest.Mock).mockResolvedValue({
        forums: mockForums,
        totalPages: 1,
      });
      (forumService.countForums as jest.Mock).mockResolvedValue(mockForums.length);

      // Act
      await forumController.getAllForums(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(forumService.getAllForums).toHaveBeenCalledWith(undefined, undefined, 1, 10);
      expect(forumService.countForums).toHaveBeenCalledWith();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        forums: mockForums,
        page: 1,
        pageSize: 10,
        totalForums: mockForums.length,
        totalPages: 1,
      });
    });

    it('should filter forums by title and return 200 status', async () => {
      // Arrange
      mockRequest = {
        query: {
          title: 'Test',
          page: '1',
          size: '10',
        },
      };

      const mockForums = [mockForumResponse];
      (forumService.getAllForums as jest.Mock).mockResolvedValue({
        forums: mockForums,
        totalPages: 1,
      });
      (forumService.countForums as jest.Mock).mockResolvedValue(mockForums.length);

      // Act
      await forumController.getAllForums(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(forumService.getAllForums).toHaveBeenCalledWith('Test', undefined, 1, 10);
      expect(forumService.countForums).toHaveBeenCalledWith();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        forums: mockForums,
        page: 1,
        pageSize: 10,
        totalForums: mockForums.length,
        totalPages: 1,
      });
    });

    it('should filter forums by createdBy and return 200 status', async () => {
      // Arrange
      mockRequest = {
        query: {
          createdBy: mockUserId,
          page: '1',
          size: '10',
        },
      };

      const mockForums = [mockForumResponse];
      (forumService.getAllForums as jest.Mock).mockResolvedValue({
        forums: mockForums,
        totalPages: 1,
      });
      (forumService.countForums as jest.Mock).mockResolvedValue(mockForums.length);

      // Act
      await forumController.getAllForums(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(forumService.getAllForums).toHaveBeenCalledWith(undefined, mockUserId, 1, 10);
      expect(forumService.countForums).toHaveBeenCalledWith();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        forums: mockForums,
        page: 1,
        pageSize: 10,
        totalForums: mockForums.length,
        totalPages: 1,
      });
    });

    it('should return 500 status when retrieval fails', async () => {
      // Arrange
      mockRequest = {
        query: {},
      };

      const errorMessage = 'Database error';
      (forumService.getAllForums as jest.Mock).mockRejectedValue(new Error(errorMessage));

      // Act
      await forumController.getAllForums(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Error retrieving forums',
        error: errorMessage,
      });
    });
  });

  describe('getForumsByUserId', () => {
    it('should get forums by user with pagination and return 200 status', async () => {
      // Arrange
      mockRequest = {
        params: {
          userId: mockUserId,
        },
        query: {
          page: '1',
          size: '10',
        },
      };

      const mockForums = [
        mockForumResponse,
        { ...mockForumResponse, _id: new Types.ObjectId().toString() },
      ];
      (forumService.getForumsByUserId as jest.Mock).mockResolvedValue({
        forums: mockForums,
        totalPages: 1,
      });
      (forumService.countForumsByUser as jest.Mock).mockResolvedValue(mockForums.length);

      // Act
      await forumController.getForumsByUserId(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(forumService.getForumsByUserId).toHaveBeenCalledWith(mockUserId, 1, 10);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        forums: mockForums,
        page: 1,
        pageSize: 10,
        totalForums: mockForums.length,
        totalPages: 1,
      });
    });

    it('should return 500 status when retrieval fails', async () => {
      // Arrange
      mockRequest = {
        params: {
          userId: mockUserId,
        },
        query: {},
      };

      const errorMessage = 'Database error';
      (forumService.getForumsByUserId as jest.Mock).mockRejectedValue(new Error(errorMessage));

      // Act
      await forumController.getForumsByUserId(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Error retrieving forums by user',
        error: errorMessage,
      });
    });
  });
});
