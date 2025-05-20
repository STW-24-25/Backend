import mongoose from 'mongoose';
import * as userController from '../controllers/user.controller';
import { UserRole, AutonomousComunity } from '../models/user.model';
import { Request, Response } from 'express';
import userService from '../services/user.service';
import S3Service from '../services/s3.service';

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
  blockUser: jest.fn(),
  unblockUser: jest.fn(),
  requestUnblock: jest.fn(),
  updateUserPassword: jest.fn(), // Was changePassword, ensure it's updateUserPassword
  makeAdmin: jest.fn(),
  uploadProfilePicture: jest.fn(),
  deleteProfilePicture: jest.fn(),
  refreshUserImages: jest.fn(),
}));

jest.mock('../services/s3.service');

// Mock para Request y Response de Express
const mockRequest = (
  data: {
    body?: any;
    params?: any;
    query?: any;
    auth?: any;
    file?: any;
  } = {},
): Request => {
  const req: Partial<Request> = {};
  req.body = data.body || {};
  req.params = data.params || {};
  req.query = data.query || {};
  req.auth = data.auth;
  req.file = data.file;

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
    (S3Service.getSignedUrl as jest.Mock).mockResolvedValue(
      'https://s3.example.com/mocked-url?signature=mock',
    );
    (S3Service.getSignedUrl as jest.Mock).mockResolvedValue(
      'https://s3.example.com/mocked-url?signature=mock',
    );
  });

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

  describe('updateUser', () => {
    const updateData = {
      username: 'updatedusername',
      email: 'updated@example.com',
    };
    const updatedUserResult = { ...mockCreatedUser, ...updateData };
    const mockFile = {
      fieldname: 'profilePicture',
      originalname: 'new_pic.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('new image data'),
      size: 54321,
    } as Express.Multer.File;

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

    it('should update current user (no req.params.id) and return 200', async () => {
      const req = mockRequest({
        auth: { id: testUserId }, // User updates their own profile
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

    it('should update user with profile picture file and return 200', async () => {
      const req = mockRequest({
        auth: { id: testUserId },
        body: updateData,
        file: mockFile, // File is present
      });
      const res = mockResponse();
      const s3Key = `users/${testUserId}/profile.jpg`;
      const updatedUserWithPicResult = { ...updatedUserResult, profilePicture: s3Key };

      (userService.uploadProfilePicture as jest.Mock).mockResolvedValue(s3Key);
      (userService.updateUser as jest.Mock).mockResolvedValue(updatedUserWithPicResult);

      await userController.updateUser(req, res);

      expect(userService.uploadProfilePicture).toHaveBeenCalledWith(testUserId, mockFile);
      expect(userService.updateUser).toHaveBeenCalledWith(testUserId, {
        ...updateData,
        profilePicture: s3Key,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User updated successfully',
        user: updatedUserWithPicResult,
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

    it('should return 500 if uploadProfilePicture fails during update', async () => {
      const req = mockRequest({
        auth: { id: testUserId },
        body: updateData,
        file: mockFile,
      });
      const res = mockResponse();
      const uploadError = 'S3 upload failed';
      (userService.uploadProfilePicture as jest.Mock).mockRejectedValue(new Error(uploadError));

      await userController.updateUser(req, res);

      expect(userService.uploadProfilePicture).toHaveBeenCalledWith(testUserId, mockFile);
      expect(userService.updateUser).not.toHaveBeenCalled(); // updateUser should not be called if upload fails
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error updating user',
        error: uploadError,
      });
    });
  });

  describe('updatePassword', () => {
    const passwordData = {
      currentPassword: 'OldPassword123',
      newPassword: 'NewPassword456',
    };

    it('should update password successfully and return 200', async () => {
      const req = mockRequest({ auth: { id: testUserId }, body: passwordData });
      const res = mockResponse();
      (userService.updateUserPassword as jest.Mock).mockResolvedValue('success');

      await userController.updatePassword(req, res);

      expect(userService.updateUserPassword).toHaveBeenCalledWith(testUserId, passwordData);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Password updated successfully' });
    });

    it('should return 400 if newPassword is not provided', async () => {
      const req = mockRequest({
        auth: { id: testUserId },
        body: { currentPassword: 'OldPassword123' },
      });
      const res = mockResponse();

      await userController.updatePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'New password is required' });
    });

    it('should return 404 if user not found by service', async () => {
      const req = mockRequest({ auth: { id: testUserId }, body: passwordData });
      const res = mockResponse();
      (userService.updateUserPassword as jest.Mock).mockResolvedValue('not_found');

      await userController.updatePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should return 401 if current password is incorrect', async () => {
      const req = mockRequest({ auth: { id: testUserId }, body: passwordData });
      const res = mockResponse();
      (userService.updateUserPassword as jest.Mock).mockResolvedValue('invalid_current_password');

      await userController.updatePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Current password is incorrect' });
    });

    it('should return 400 if current password provided for OAuth user setting first password', async () => {
      const req = mockRequest({ auth: { id: testUserId }, body: passwordData });
      const res = mockResponse();
      (userService.updateUserPassword as jest.Mock).mockResolvedValue(
        'oauth_user_no_current_password_expected',
      );

      await userController.updatePassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message:
          'Cannot provide current password when setting a password for the first time for an OAuth account.',
      });
    });

    it('should return 400 if current password is required but not provided', async () => {
      const req = mockRequest({
        auth: { id: testUserId },
        body: { newPassword: 'NewPassword456' },
      }); // No currentPassword
      const res = mockResponse();
      (userService.updateUserPassword as jest.Mock).mockResolvedValue('current_password_required');

      await userController.updatePassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Current password is required to change your existing password.',
      });
    });

    it('should return 500 for unhandled service result (default switch case)', async () => {
      const req = mockRequest({ auth: { id: testUserId }, body: passwordData });
      const res = mockResponse();
      (userService.updateUserPassword as jest.Mock).mockResolvedValue('some_unknown_result'); // Simulate an unhandled string

      await userController.updatePassword(req, res);

      expect(userService.updateUserPassword).toHaveBeenCalledWith(testUserId, passwordData);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'An unexpected error occurred during password update',
      });
    });

    it('should return 500 if service throws an unexpected error', async () => {
      const req = mockRequest({ auth: { id: testUserId }, body: passwordData });
      const res = mockResponse();
      const errorMessage = 'Service unavailable';
      (userService.updateUserPassword as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await userController.updatePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error updating password',
        error: errorMessage,
      });
    });
  });

  describe('deleteUser', () => {
    it('should call userService.deleteUser and return 200 on success', async () => {
      const req = mockRequest({
        params: { id: testUserId },
        auth: { id: testUserId, isAdmin: false },
      });
      const res = mockResponse();

      (userService.deleteUser as jest.Mock).mockResolvedValue(true);

      await userController.deleteUser(req, res);

      expect(userService.deleteUser).toHaveBeenCalledWith(testUserId);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'User deleted successfully' });
    });

    it('should return 403 if non-admin tries to delete another user', async () => {
      const otherUserId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({
        params: { id: otherUserId }, // Trying to delete otherUserId
        auth: { id: testUserId, isAdmin: false }, // Authenticated as testUserId, not an admin
      });
      const res = mockResponse();

      await userController.deleteUser(req, res);

      expect(userService.deleteUser).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Forbidden: You do not have permission to delete this user',
      });
    });

    it('should return 404 if userService.deleteUser returns false', async () => {
      const validButNonExistentId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({
        params: { id: validButNonExistentId },
        auth: { id: validButNonExistentId, isAdmin: false },
      });
      const res = mockResponse();

      (userService.deleteUser as jest.Mock).mockResolvedValue(false);

      await userController.deleteUser(req, res);

      expect(userService.deleteUser).toHaveBeenCalledWith(validButNonExistentId);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should return 500 if userService.deleteUser throws an error', async () => {
      const req = mockRequest({
        params: { id: testUserId },
        auth: { id: testUserId, isAdmin: false },
      });
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

  describe('makeAdmin', () => {
    const targetUserId = new mongoose.Types.ObjectId().toString();
    it('should make a user admin and return 200', async () => {
      const req = mockRequest({ body: { id: targetUserId } });
      const res = mockResponse();
      (userService.makeAdmin as jest.Mock).mockResolvedValue(true);

      await userController.makeAdmin(req, res);

      expect(userService.makeAdmin).toHaveBeenCalledWith(targetUserId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'User promoted to admin successfully' });
    });

    it('should return 404 if user to make admin is not found', async () => {
      const req = mockRequest({ body: { id: targetUserId } });
      const res = mockResponse();
      (userService.makeAdmin as jest.Mock).mockResolvedValue(false);

      await userController.makeAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should return 500 if service throws an error', async () => {
      const req = mockRequest({ body: { id: targetUserId } });
      const res = mockResponse();
      const errorMessage = 'Promotion failed';
      (userService.makeAdmin as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await userController.makeAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error promoting user to admin',
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
      const req = mockRequest({ body: { appeal: appeal }, auth: { id: testUserId } });
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
      const req = mockRequest({ body: { appeal: appeal }, auth: { id: validButNonExistentId } });
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
      const req = mockRequest({ body: { appeal: appeal }, auth: { id: testUserId } });
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

  describe('uploadProfilePicture', () => {
    const mockFile = {
      fieldname: 'profilePicture',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('test image data'),
      size: 12345,
    } as Express.Multer.File;

    it('should upload profile picture and return 200 with image URL', async () => {
      const req = mockRequest({ auth: { id: testUserId }, file: mockFile });
      const res = mockResponse();
      const s3Key = `users/${testUserId}/profile.jpg`;
      const signedUrl = `https://s3.example.com/${s3Key}?signature=mock`;

      (userService.uploadProfilePicture as jest.Mock).mockResolvedValue(s3Key);
      // S3Service.getSignedUrl is mocked in beforeEach or can be specifically set here if needed
      (S3Service.getSignedUrl as jest.Mock).mockResolvedValue(signedUrl); // Specific mock for this test

      await userController.uploadProfilePicture(req, res);

      expect(userService.uploadProfilePicture).toHaveBeenCalledWith(testUserId, mockFile);
      expect(S3Service.getSignedUrl).toHaveBeenCalledWith(s3Key);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User profile picture uploaded succesfully',
        imageUrl: signedUrl,
      });
    });

    it('should return 400 if no file is uploaded', async () => {
      const req = mockRequest({ auth: { id: testUserId } }); // No file
      const res = mockResponse();

      await userController.uploadProfilePicture(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'No file was uploaded' });
    });

    it('should return 500 if userService.uploadProfilePicture throws', async () => {
      const req = mockRequest({ auth: { id: testUserId }, file: mockFile });
      const res = mockResponse();
      const errorMessage = 'Upload failed';
      (userService.uploadProfilePicture as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await userController.uploadProfilePicture(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error uploading user profile picture:',
        error: errorMessage,
      });
    });
  });

  describe('deleteProfilePicture', () => {
    it('should delete profile picture and return 200', async () => {
      const req = mockRequest({ auth: { id: testUserId } });
      const res = mockResponse();
      (userService.deleteProfilePicture as jest.Mock).mockResolvedValue(true);

      await userController.deleteProfilePicture(req, res);

      expect(userService.deleteProfilePicture).toHaveBeenCalledWith(testUserId);
      expect(res.status).toHaveBeenCalledWith(200); // Controller sends 200
      expect(res.json).toHaveBeenCalledWith({ message: 'Profile picture successfully deleted' });
    });

    it('should return 404 if userService.deleteProfilePicture returns false', async () => {
      const req = mockRequest({ auth: { id: testUserId } });
      const res = mockResponse();
      (userService.deleteProfilePicture as jest.Mock).mockResolvedValue(false);

      await userController.deleteProfilePicture(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User not found or has no profile picture',
      });
    });

    it('should return 500 if userService.deleteProfilePicture throws', async () => {
      const req = mockRequest({ auth: { id: testUserId } });
      const res = mockResponse();
      const errorMessage = 'Deletion failed';
      (userService.deleteProfilePicture as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await userController.deleteProfilePicture(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error deleting profile picture',
        error: errorMessage,
      });
    });
  });

  describe('refreshUserImages', () => {
    const userIdsToRefresh = [
      new mongoose.Types.ObjectId().toString(),
      new mongoose.Types.ObjectId().toString(),
    ];
    const refreshedImageUrls = {
      [userIdsToRefresh[0]]: 'signed-url-1',
      [userIdsToRefresh[1]]: 'signed-url-2',
    };

    it('should refresh user images and return 200', async () => {
      const req = mockRequest({ body: { userIds: userIdsToRefresh } });
      const res = mockResponse();
      (userService.refreshUserImages as jest.Mock).mockResolvedValue(refreshedImageUrls);

      await userController.refreshUserImages(req, res);

      expect(userService.refreshUserImages).toHaveBeenCalledWith(userIdsToRefresh);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ images: refreshedImageUrls });
    });

    it('should return 500 if userService.refreshUserImages throws', async () => {
      const req = mockRequest({ body: { userIds: userIdsToRefresh } });
      const res = mockResponse();
      const errorMessage = 'Refresh failed';
      (userService.refreshUserImages as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await userController.refreshUserImages(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error refreshing images' }); // Error message from controller
    });
  });
});
