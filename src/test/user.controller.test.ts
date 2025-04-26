import mongoose from 'mongoose';
import * as userController from '../controllers/user.controller';
import { UserRole, AutonomousComunity } from '../models/user.model';
import { Request, Response } from 'express';
import userService from '../services/user.service';

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Mock del servicio de usuario
jest.mock('../services/user.service', () => ({
  createUser: jest.fn(),
  getUserById: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  loginUser: jest.fn(),
  getAllUsers: jest.fn(),
  countUsers: jest.fn(),
  changePassword: jest.fn(),
  findUsersBySearchCriteria: jest.fn(),
  validateUserToken: jest.fn(),
  blockUser: jest.fn(),
  unblockUser: jest.fn(),
  requestUnblock: jest.fn(),
}));

// Mock para Request y Response de Express
const mockRequest = (data: any = {}): Request => {
  const req: Partial<Request> = {};
  req.body = data.body || {};
  req.params = data.params || {};
  req.query = data.query || {};

  return req as Request;
};

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

describe('UserController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Datos de prueba
  const testUserDataInput = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'Password123',
    role: UserRole.SMALL_FARMER,
    autonomousCommunity: AutonomousComunity.ARAGON,
  };

  const testUserId = new mongoose.Types.ObjectId().toString();
  const mockCreatedUser = {
    // Data returned by the service (passwordHash instead of password)
    _id: testUserId,
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hashedPassword123', // Service handles hashing
    role: UserRole.SMALL_FARMER,
    autonomousCommunity: AutonomousComunity.ARAGON,
    isAdmin: false,
    createdAt: new Date(),
    isBlocked: false,
    loginHistory: [],
  };

  describe('createUser', () => {
    it('should call userService.createUser and return 201 on success', async () => {
      const req = mockRequest({ body: testUserDataInput });
      const res = mockResponse();

      (userService.createUser as jest.Mock).mockResolvedValue(mockCreatedUser);

      await userController.createUser(req, res);

      expect(userService.createUser).toHaveBeenCalledWith(testUserDataInput);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();

      expect(res.json).toHaveBeenCalledWith({ message: 'User created successfully' });
    });

    it('should return 500 if userService.createUser throws an error', async () => {
      const req = mockRequest({ body: testUserDataInput });
      const res = mockResponse();
      const errorMessage = 'A user already exists with this email';

      // Mock service failure (e.g., duplicate entry)
      (userService.createUser as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await userController.createUser(req, res);

      // Verify service call
      expect(userService.createUser).toHaveBeenCalledWith(testUserDataInput);

      // Verify error response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error creating user', // Adjust message based on controller's catch block
        error: errorMessage,
      });
    });
  });

  describe('getUser', () => {
    it('should call userService.getUserById and return 200 with user data', async () => {
      const req = mockRequest({ params: { id: testUserId } });
      const res = mockResponse();

      (userService.getUserById as jest.Mock).mockResolvedValue(mockCreatedUser);

      await userController.getUser(req, res);

      expect(userService.getUserById).toHaveBeenCalledWith(testUserId);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockCreatedUser);
    });

    it('should return 404 if userService.getUserById returns null', async () => {
      const validButNonExistentId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({ params: { id: validButNonExistentId } });
      const res = mockResponse();

      (userService.getUserById as jest.Mock).mockResolvedValue(null);

      await userController.getUser(req, res);

      expect(userService.getUserById).toHaveBeenCalledWith(validButNonExistentId);

      // Verify response
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should return 500 if userService.getUserById throws an error', async () => {
      const req = mockRequest({ params: { id: testUserId } });
      const res = mockResponse();
      const errorMessage = 'Database connection error';

      (userService.getUserById as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await userController.getUser(req, res);

      expect(userService.getUserById).toHaveBeenCalledWith(testUserId);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error retrieving user',
        error: errorMessage,
      });
    });
  });

  describe('login', () => {
    const loginCredentials = {
      usernameOrEmail: testUserDataInput.email,
      password: testUserDataInput.password,
    };

    it('should call userService.loginUser and return 200 with token/user on success', async () => {
      const req = mockRequest({ body: loginCredentials });
      const res = mockResponse();
      const loginResult = { token: 'mocked-jwt-token', user: mockCreatedUser };

      (userService.loginUser as jest.Mock).mockResolvedValue(loginResult);

      await userController.login(req, res);

      expect(userService.loginUser).toHaveBeenCalledWith(
        loginCredentials.usernameOrEmail,
        loginCredentials.password,
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(loginResult);
    });

    it('should return 401 if userService.loginUser returns null (invalid credentials)', async () => {
      const req = mockRequest({ body: loginCredentials });
      const res = mockResponse();

      (userService.loginUser as jest.Mock).mockResolvedValue(null);

      await userController.login(req, res);

      expect(userService.loginUser).toHaveBeenCalledWith(
        loginCredentials.usernameOrEmail,
        loginCredentials.password,
      );

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });

    it('should return 500 if userService.loginUser throws an error', async () => {
      const req = mockRequest({ body: loginCredentials });
      const res = mockResponse();
      const errorMessage = 'Authentication service unavailable';

      (userService.loginUser as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await userController.login(req, res);

      expect(userService.loginUser).toHaveBeenCalledWith(
        loginCredentials.usernameOrEmail,
        loginCredentials.password,
      );

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Login error',
        error: errorMessage,
      });
    });
  });

  describe('updateUser', () => {
    const updateData = {
      username: 'updatedusername',
      email: 'updated@example.com',
    };
    const updatedUserResult = { ...mockCreatedUser, ...updateData };

    it('should call userService.updateUser and return 200 with updated user', async () => {
      const req = mockRequest({
        params: { id: testUserId },
        body: updateData,
      });
      const res = mockResponse();

      (userService.updateUser as jest.Mock).mockResolvedValue(updatedUserResult);

      await userController.updateUser(req, res);

      expect(userService.updateUser).toHaveBeenCalledWith(testUserId, updateData);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User updated successfully',
        user: updatedUserResult,
      });
    });

    it('should return 404 if userService.updateUser returns null', async () => {
      const validButNonExistentId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({
        params: { id: validButNonExistentId },
        body: updateData,
      });
      const res = mockResponse();

      (userService.updateUser as jest.Mock).mockResolvedValue(null);

      await userController.updateUser(req, res);

      expect(userService.updateUser).toHaveBeenCalledWith(validButNonExistentId, updateData);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should return 500 if userService.updateUser throws an error', async () => {
      const req = mockRequest({
        params: { id: testUserId },
        body: updateData,
      });
      const res = mockResponse();
      const errorMessage = 'Database update conflict';

      // Mock service failure
      (userService.updateUser as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await userController.updateUser(req, res);

      // Verify service call
      expect(userService.updateUser).toHaveBeenCalledWith(testUserId, updateData);

      // Verify error response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error updating user',
        error: errorMessage,
      });
    });
  });

  describe('deleteUser', () => {
    it('should call userService.deleteUser and return 200 on success', async () => {
      const req = mockRequest({ params: { id: testUserId } });
      const res = mockResponse();

      (userService.deleteUser as jest.Mock).mockResolvedValue(true);

      await userController.deleteUser(req, res);

      expect(userService.deleteUser).toHaveBeenCalledWith(testUserId);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'User deleted successfully' });
    });

    it('should return 404 if userService.deleteUser returns false', async () => {
      const validButNonExistentId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({ params: { id: validButNonExistentId } });
      const res = mockResponse();

      (userService.deleteUser as jest.Mock).mockResolvedValue(false);

      await userController.deleteUser(req, res);

      expect(userService.deleteUser).toHaveBeenCalledWith(validButNonExistentId);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should return 500 if userService.deleteUser throws an error', async () => {
      const req = mockRequest({ params: { id: testUserId } });
      const res = mockResponse();
      const errorMessage = 'Database constraint violation';

      (userService.deleteUser as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await userController.deleteUser(req, res);

      expect(userService.deleteUser).toHaveBeenCalledWith(testUserId);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error deleting user',
        error: errorMessage,
      });
    });
  });

  describe('getAllUsers', () => {
    it('should call userService.getAllUsers/countUsers and return 200 with pagination', async () => {
      const mockUsers = [
        mockCreatedUser,
        { ...mockCreatedUser, _id: new mongoose.Types.ObjectId().toString() },
      ];
      const mockTotalPages = 1;
      const mockTotalUsers = mockUsers.length;
      const page = 1;
      const size = 16;

      (userService.getAllUsers as jest.Mock).mockResolvedValue({
        users: mockUsers,
        totalPages: mockTotalPages,
      });
      (userService.countUsers as jest.Mock).mockResolvedValue(mockTotalUsers);

      const req = mockRequest({
        query: { page: page.toString(), size: size.toString() },
      });
      const res = mockResponse();

      await userController.getAllUsers(req, res);

      expect(userService.getAllUsers).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        page,
        size,
      );
      expect(userService.countUsers).toHaveBeenCalled();

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        users: mockUsers,
        page: page,
        pageSize: size,
        totalUsers: mockTotalUsers,
        totalPages: mockTotalPages,
      });
    });

    it('should return 500 if userService.getAllUsers throws an error', async () => {
      const req = mockRequest({ query: { page: '1', size: '10' } });
      const res = mockResponse();
      const errorMessage = 'Database query failed';

      (userService.getAllUsers as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (userService.countUsers as jest.Mock).mockResolvedValue(0);

      await userController.getAllUsers(req, res);

      expect(userService.getAllUsers).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        1,
        10,
      );

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error retrieving users',
        error: errorMessage,
      });
    });

    it('should return 500 if userService.countUsers throws an error', async () => {
      const req = mockRequest({ query: { page: '1', size: '10' } });
      const res = mockResponse();
      const errorMessage = 'Database count failed';

      (userService.getAllUsers as jest.Mock).mockResolvedValue({ users: [], totalPages: 0 });
      (userService.countUsers as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await userController.getAllUsers(req, res);

      expect(userService.getAllUsers).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        1,
        10,
      );
      expect(userService.countUsers).toHaveBeenCalled();

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error retrieving users',
        error: errorMessage,
      });
    });
  });

  describe('blockUser', () => {
    const reason = 'abc';

    it('should call userService.blockUser and return 200 on success', async () => {
      const req = mockRequest({ body: { id: testUserId, reason: reason } });
      const res = mockResponse();

      // Mock service success
      (userService.blockUser as jest.Mock).mockResolvedValue(true);

      await userController.blockUser(req, res);

      // Verify service call
      expect(userService.blockUser).toHaveBeenCalledWith(testUserId, reason);

      // Verify response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'User blocked successfully' });
    });

    it('should return 404 if userService.blockUser returns false', async () => {
      const validButNonExistentId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({ body: { id: validButNonExistentId, reason: reason } });
      const res = mockResponse();

      // Mock service not finding the user
      (userService.blockUser as jest.Mock).mockResolvedValue(false);

      await userController.blockUser(req, res);

      // Verify service call
      expect(userService.blockUser).toHaveBeenCalledWith(validButNonExistentId, reason);

      // Verify response
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should return 500 if userService.blockUser throws an error', async () => {
      const req = mockRequest({ body: { id: testUserId, reason: reason } });
      const res = mockResponse();
      const errorMessage = 'Database error during block';

      // Mock service failure
      (userService.blockUser as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await userController.blockUser(req, res);

      // Verify service call
      expect(userService.blockUser).toHaveBeenCalledWith(testUserId, reason);

      // Verify error response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error blocking user', // Adjust based on controller
        error: errorMessage,
      });
    });
  });

  describe('unblockUser', () => {
    it('should call userService.unblockUser and return 200 on success', async () => {
      const req = mockRequest({ body: { id: testUserId } });
      const res = mockResponse();

      // Mock service success
      (userService.unblockUser as jest.Mock).mockResolvedValue(true);

      await userController.unblockUser(req, res);

      // Verify service call
      expect(userService.unblockUser).toHaveBeenCalledWith(testUserId);

      // Verify response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'User unblocked successfully' });
    });

    it('should return 404 if userService.unblockUser returns false', async () => {
      const validButNonExistentId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({ body: { id: validButNonExistentId } });
      const res = mockResponse();

      // Mock service not finding the user
      (userService.unblockUser as jest.Mock).mockResolvedValue(false);

      await userController.unblockUser(req, res);

      // Verify service call
      expect(userService.unblockUser).toHaveBeenCalledWith(validButNonExistentId);

      // Verify response
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should return 500 if userService.unblockUser throws an error', async () => {
      const req = mockRequest({ body: { id: testUserId } });
      const res = mockResponse();
      const errorMessage = 'Database error during unblock';

      // Mock service failure
      (userService.unblockUser as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await userController.unblockUser(req, res);

      // Verify service call
      expect(userService.unblockUser).toHaveBeenCalledWith(testUserId);

      // Verify error response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error unblocking user', // Adjust based on controller
        error: errorMessage,
      });
    });
  });

  describe('requestUnblock', () => {
    const appeal = 'def';

    it('should call userService.requestUnblock and return 200 on success', async () => {
      const req = mockRequest({ body: { id: testUserId, appeal: appeal } });
      const res = mockResponse();

      (userService.requestUnblock as jest.Mock).mockResolvedValue(true);

      await userController.requestUnblock(req, res);

      expect(userService.requestUnblock).toHaveBeenCalledWith(testUserId, appeal);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unblock appeal registered successfully' });
    });

    it('should return 404 if userService.requestUnblock returns false', async () => {
      const validButNonExistentId = new mongoose.Types.ObjectId().toString();
      // Assuming appeal comes from req.body
      const req = mockRequest({ body: { id: validButNonExistentId, appeal: appeal } });
      const res = mockResponse();

      // Mock service not finding the user
      (userService.requestUnblock as jest.Mock).mockResolvedValue(false);

      await userController.requestUnblock(req, res);

      // Verify service call
      expect(userService.requestUnblock).toHaveBeenCalledWith(validButNonExistentId, appeal);

      // Verify response
      expect(res.status).toHaveBeenCalledWith(404); // Changed from 200 based on typical REST patterns
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should return 500 if userService.requestUnblock throws an error', async () => {
      // Assuming appeal comes from req.body
      const req = mockRequest({ body: { id: testUserId, appeal: appeal } });
      const res = mockResponse();
      const errorMessage = 'Database error during appeal';

      // Mock service failure
      (userService.requestUnblock as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await userController.requestUnblock(req, res);

      // Verify service call
      expect(userService.requestUnblock).toHaveBeenCalledWith(testUserId, appeal);

      // Verify error response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error requesting to unblock user', // Adjust based on controller
        error: errorMessage,
      });
    });
  });
});
