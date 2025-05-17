import mongoose from 'mongoose';
import * as authController from '../controllers/auth.controller';
import { UserRole, AutonomousComunity } from '../models/user.model';
import { genJWT } from '../middleware/auth';
import { Request, Response } from 'express';
import userService from '../services/user.service';

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../services/user.service', () => ({
  createUser: jest.fn(),
  loginUser: jest.fn(),
}));

// Mock para Request y Response de Express
const mockRequest = (
  data: {
    body?: any;
    params?: any;
    query?: any;
    auth?: any;
  } = {},
): Request => {
  const req: Partial<Request> = {};
  req.body = data.body || {};
  req.params = data.params || {};
  req.query = data.query || {};
  req.auth = data.auth;

  return req as Request;
};

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

describe('AuthController', () => {
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

  const mockToken = genJWT({
    id: testUserId,
    username: mockCreatedUser.username,
    email: mockCreatedUser.email,
    role: mockCreatedUser.role,
    isAdmin: mockCreatedUser.isAdmin,
  });

  describe('createUser', () => {
    it('should call userService.createUser and return 201 on success', async () => {
      const req = mockRequest({ body: testUserDataInput });
      const res = mockResponse();

      (userService.createUser as jest.Mock).mockResolvedValue({
        user: mockCreatedUser,
        token: mockToken,
      });

      await authController.createUser(req, res);

      expect(userService.createUser).toHaveBeenCalledWith(testUserDataInput);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();

      expect(res.json).toHaveBeenCalledWith({
        user: mockCreatedUser,
        token: mockToken,
      });
    });

    it('should return 500 if userService.createUser throws an error', async () => {
      const req = mockRequest({ body: testUserDataInput });
      const res = mockResponse();
      const errorMessage = 'A user already exists with this email';

      // Mock service failure (e.g., duplicate entry)
      (userService.createUser as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await authController.createUser(req, res);

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

      await authController.login(req, res);

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

      await authController.login(req, res);

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

      await authController.login(req, res);

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
});
