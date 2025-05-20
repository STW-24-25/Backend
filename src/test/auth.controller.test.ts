import mongoose from 'mongoose';
import * as authController from '../controllers/auth.controller';
import { UserRole, AutonomousComunity, IUser } from '../models/user.model';
import { Request, Response } from 'express';
import authService from '../services/auth.service';
import { TokenPayload } from 'google-auth-library';
import userService from '../services/user.service';
import { genJWT } from '../middleware/auth';

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../services/auth.service', () => ({
  createUser: jest.fn(),
  loginUser: jest.fn(),
  verifyGoogleToken: jest.fn(),
  loginGoogleUser: jest.fn(),
  verifyGithubToken: jest.fn(),
  loginGithubUser: jest.fn(),
}));

// Add mock for userService
jest.mock('../services/user.service', () => ({
  getUserByProviderId: jest.fn(),
  getUserByEmail: jest.fn(),
  addProviderIdToUser: jest.fn(),
}));

jest.mock('../middleware/auth', () => ({
  genJWT: jest.fn(),
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
    _id: testUserId,
    username: 'testuser',
    email: 'test@example.com',
    role: UserRole.SMALL_FARMER,
    autonomousCommunity: AutonomousComunity.ARAGON,
    isAdmin: false,
    isBlocked: false,
    googleId: 'google123',
    githubId: 'github123',
    parcels: [],
    loginHistory: [],
    toObject: jest.fn().mockImplementation(function (this: any) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...rest } = this;
      return rest;
    }),
    save: jest.fn().mockResolvedValue(this),
  } as unknown as IUser;

  const mockToken = 'mocked-jwt-token';

  describe('createUser', () => {
    it('should call authService.createUser and return 201 on success', async () => {
      const req = mockRequest({ body: testUserDataInput });
      const res = mockResponse();

      (authService.createUser as jest.Mock).mockResolvedValue({
        user: mockCreatedUser,
        token: mockToken,
      });

      await authController.createUser(req, res);

      expect(authService.createUser).toHaveBeenCalledWith(testUserDataInput);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();

      expect(res.json).toHaveBeenCalledWith({
        user: mockCreatedUser,
        token: mockToken,
      });
    });

    it('should return 500 if authService.createUser throws an error', async () => {
      const req = mockRequest({ body: testUserDataInput });
      const res = mockResponse();
      const errorMessage = 'A user already exists with this email';

      // Mock service failure (e.g., duplicate entry)
      (authService.createUser as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await authController.createUser(req, res);

      // Verify service call
      expect(authService.createUser).toHaveBeenCalledWith(testUserDataInput);

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

    it('should call authService.loginUser and return 200 with token/user on success', async () => {
      const req = mockRequest({ body: loginCredentials });
      const res = mockResponse();
      const loginResult = { token: 'mocked-jwt-token', user: mockCreatedUser };
      (authService.loginUser as jest.Mock).mockResolvedValue(loginResult);

      await authController.login(req, res);

      expect(authService.loginUser).toHaveBeenCalledWith(
        loginCredentials.usernameOrEmail,
        loginCredentials.password,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(loginResult);
    });

    it('should return 401 if authService.loginUser returns null (invalid credentials)', async () => {
      const req = mockRequest({ body: loginCredentials });
      const res = mockResponse();
      (authService.loginUser as jest.Mock).mockResolvedValue(null);

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });

    it('should return 500 if authService.loginUser throws an error', async () => {
      const req = mockRequest({ body: loginCredentials });
      const res = mockResponse();
      const errorMessage = 'Authentication service unavailable';
      (authService.loginUser as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Login error',
        error: errorMessage,
      });
    });
  });

  describe('googleLogin', () => {
    const mockGoogleToken = 'mockGoogleIdToken';
    const mockGoogleId = 'google123';
    const mockGooglePayload = {
      sub: mockGoogleId,
      email: 'test@example.com',
      name: 'Test User',
    } as TokenPayload;

    it('should login successfully if user found by googleId', async () => {
      const req = mockRequest({ body: { id_token: mockGoogleToken, id: mockGoogleId } });
      const res = mockResponse();
      (authService.verifyGoogleToken as jest.Mock).mockResolvedValue(mockGooglePayload);
      (userService.getUserByProviderId as jest.Mock).mockResolvedValue(mockCreatedUser);
      (authService.loginGoogleUser as jest.Mock).mockResolvedValue({
        user: mockCreatedUser,
        token: mockToken,
      });

      await authController.googleLogin(req, res);

      expect(authService.verifyGoogleToken).toHaveBeenCalledWith(mockGoogleToken, mockGoogleId);
      expect(userService.getUserByProviderId).toHaveBeenCalledWith(mockGooglePayload.sub, 'google');
      expect(authService.loginGoogleUser).toHaveBeenCalledWith(
        mockCreatedUser.username,
        mockCreatedUser.email,
        mockCreatedUser.googleId,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ user: mockCreatedUser, token: mockToken });
    });

    it('should link and login if user found by email but not googleId', async () => {
      const req = mockRequest({ body: { id_token: mockGoogleToken, id: mockGoogleId } });
      const res = mockResponse();
      const userWithoutGoogleId = {
        ...mockCreatedUser,
        googleId: undefined,
        _id: new mongoose.Types.ObjectId().toString(),
      } as unknown as IUser;

      (authService.verifyGoogleToken as jest.Mock).mockResolvedValue(mockGooglePayload);
      (userService.getUserByProviderId as jest.Mock).mockResolvedValue(null);
      (userService.getUserByEmail as jest.Mock).mockResolvedValue(userWithoutGoogleId);
      (userService.addProviderIdToUser as jest.Mock).mockResolvedValue({
        ...userWithoutGoogleId,
        googleId: mockGooglePayload.sub,
      } as IUser);
      (authService.loginGoogleUser as jest.Mock).mockResolvedValue({
        user: { ...userWithoutGoogleId, googleId: mockGooglePayload.sub } as IUser,
        token: mockToken,
      });

      await authController.googleLogin(req, res);

      expect(userService.getUserByEmail).toHaveBeenCalledWith(mockGooglePayload.email);
      expect(userService.addProviderIdToUser).toHaveBeenCalledWith(
        userWithoutGoogleId._id,
        mockGooglePayload.sub,
        'google',
      );
      expect(authService.loginGoogleUser).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Google account successfully linked and logged in.' }),
      );
    });

    it('should return 409 if email is linked to a different googleId', async () => {
      const req = mockRequest({ body: { id_token: mockGoogleToken, id: mockGoogleId } });
      const res = mockResponse();
      const conflictingUser = { ...mockCreatedUser, googleId: 'differentGoogleId' } as IUser;
      (authService.verifyGoogleToken as jest.Mock).mockResolvedValue(mockGooglePayload);
      (userService.getUserByProviderId as jest.Mock).mockResolvedValue(null);
      (userService.getUserByEmail as jest.Mock).mockResolvedValue(conflictingUser);

      await authController.googleLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        message: expect.stringContaining('already linked to a different Google account'),
      });
    });

    it('should return 202 needsMoreData if no user found by googleId or email', async () => {
      const req = mockRequest({ body: { id_token: mockGoogleToken, id: mockGoogleId } });
      const res = mockResponse();
      (authService.verifyGoogleToken as jest.Mock).mockResolvedValue(mockGooglePayload);
      (userService.getUserByProviderId as jest.Mock).mockResolvedValue(null);
      (userService.getUserByEmail as jest.Mock).mockResolvedValue(null);

      await authController.googleLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith({
        needsMoreData: true,
        googlePayload: mockGooglePayload,
      });
    });

    it('should return 401 if google token is invalid', async () => {
      const req = mockRequest({ body: { id_token: mockGoogleToken, id: mockGoogleId } });
      const res = mockResponse();
      (authService.verifyGoogleToken as jest.Mock).mockResolvedValue(null);

      await authController.googleLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid Google ID token' });
    });

    it('should return 401 if the credentials are invalid', async () => {
      const req = mockRequest({ body: { id_token: mockGoogleToken, id: mockGoogleId } });
      const res = mockResponse();

      (authService.verifyGoogleToken as jest.Mock).mockResolvedValue(mockGooglePayload);
      (userService.getUserByProviderId as jest.Mock).mockResolvedValue(mockCreatedUser);
      (authService.loginGoogleUser as jest.Mock).mockResolvedValue(null);

      await authController.googleLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });

    it('should return 500 if addProviderIdToUser fails', async () => {
      const req = mockRequest({ body: { id_token: mockGoogleToken, id: mockGoogleId } });
      const res = mockResponse();
      const userWithoutGoogleId = {
        ...mockCreatedUser,
        googleId: undefined,
        _id: new mongoose.Types.ObjectId().toString(),
      } as unknown as IUser;
      (authService.verifyGoogleToken as jest.Mock).mockResolvedValue(mockGooglePayload);
      (userService.getUserByProviderId as jest.Mock).mockResolvedValue(null);
      (userService.getUserByEmail as jest.Mock).mockResolvedValue(userWithoutGoogleId);
      (userService.addProviderIdToUser as jest.Mock).mockResolvedValue(null); // Simulate failure

      await authController.googleLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to link Google account to existing user.',
      });
    });

    it('should return 500 if the login failed after linking the google account', async () => {
      const req = mockRequest({ body: { id_token: mockGoogleToken, id: mockGoogleId } });
      const res = mockResponse();
      const userWithoutGoogleId = {
        ...mockCreatedUser,
        googleId: undefined,
        _id: new mongoose.Types.ObjectId().toString(),
      } as unknown as IUser;

      (authService.verifyGoogleToken as jest.Mock).mockResolvedValue(mockGooglePayload);
      (userService.getUserByProviderId as jest.Mock).mockResolvedValue(null);
      (userService.getUserByEmail as jest.Mock).mockResolvedValue(userWithoutGoogleId);
      (userService.addProviderIdToUser as jest.Mock).mockResolvedValue({
        ...userWithoutGoogleId,
        googleId: mockGooglePayload.sub,
      } as IUser);
      (authService.loginGoogleUser as jest.Mock).mockResolvedValue(null);

      await authController.googleLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Login failed after linking Google account.',
      });
    });

    it('should return 500 if there was some unexpected error', async () => {
      const req = mockRequest({ body: { id_token: mockGoogleToken, id: mockGoogleId } });
      const res = mockResponse();
      const err = 'Error finding user by ID: Some mongo error';

      (userService.getUserByProviderId as jest.Mock).mockRejectedValue(new Error(err));

      await authController.googleLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Google login failed', error: err });
    });
  });

  describe('googleRegister', () => {
    const mockGoogleToken = 'mockGoogleIdToken';
    const mockGoogleId = 'google123';
    const mockGoogleClientData = {
      id_token: mockGoogleToken,
      id: mockGoogleId,
      email: 'test@example.com',
    }; // email from client
    const mockGooglePayload = { sub: mockGoogleId, email: 'test@example.com' } as TokenPayload;
    const registerUserData = {
      username: 'newguser',
      role: UserRole.EXPERT,
      autonomousCommunity: AutonomousComunity.CATALUGNA,
    };

    it('should register a new user successfully', async () => {
      const req = mockRequest({ body: { userData: registerUserData, ...mockGoogleClientData } });
      const res = mockResponse();
      (authService.verifyGoogleToken as jest.Mock).mockResolvedValue(mockGooglePayload);
      (userService.getUserByProviderId as jest.Mock).mockResolvedValue(null);
      (userService.getUserByEmail as jest.Mock).mockResolvedValue(null);
      (authService.createUser as jest.Mock).mockResolvedValue({
        user: { ...mockCreatedUser, ...registerUserData, email: mockGooglePayload.email! },
        token: mockToken,
      });

      await authController.googleRegister(req, res);

      expect(authService.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          ...registerUserData,
          email: mockGooglePayload.email,
          googleId: mockGooglePayload.sub,
        }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: mockToken }));
    });

    it('should link to existing user by email if not linked to googleId', async () => {
      const req = mockRequest({ body: { userData: registerUserData, ...mockGoogleClientData } });
      const res = mockResponse();
      const existingUserWithoutGoogleId = {
        ...mockCreatedUser,
        email: mockGooglePayload.email!,
        googleId: undefined,
        _id: testUserId,
      } as unknown as IUser;
      const linkedUser = {
        ...existingUserWithoutGoogleId,
        googleId: mockGooglePayload.sub,
      } as IUser;

      (authService.verifyGoogleToken as jest.Mock).mockResolvedValue(mockGooglePayload);
      (userService.getUserByProviderId as jest.Mock).mockResolvedValue(null);
      (userService.getUserByEmail as jest.Mock).mockResolvedValue(existingUserWithoutGoogleId);
      (userService.addProviderIdToUser as jest.Mock).mockResolvedValue(linkedUser);
      (genJWT as jest.Mock).mockReturnValue(mockToken);

      await authController.googleRegister(req, res);

      expect(userService.addProviderIdToUser).toHaveBeenCalledWith(
        existingUserWithoutGoogleId._id,
        mockGooglePayload.sub,
        'google',
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Google account successfully linked to existing user.',
        token: mockToken,
        user: mockCreatedUser,
      });
    });

    it('should return 409 if googleId already linked', async () => {
      const req = mockRequest({ body: { userData: registerUserData, ...mockGoogleClientData } });
      const res = mockResponse();
      (authService.verifyGoogleToken as jest.Mock).mockResolvedValue(mockGooglePayload);
      (userService.getUserByProviderId as jest.Mock).mockResolvedValue(mockCreatedUser); // User already exists with this googleId

      await authController.googleRegister(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Google account already linked to an existing user',
      });
    });

    it('should return 409 if email is linked to a different googleId', async () => {
      const req = mockRequest({ body: { userData: registerUserData, ...mockGoogleClientData } });
      const res = mockResponse();
      const conflictingUser = {
        ...mockCreatedUser,
        email: mockGooglePayload.email!,
        googleId: 'differentGoogleId',
      } as IUser;
      (authService.verifyGoogleToken as jest.Mock).mockResolvedValue(mockGooglePayload);
      (userService.getUserByProviderId as jest.Mock).mockResolvedValue(null);
      (userService.getUserByEmail as jest.Mock).mockResolvedValue(conflictingUser);

      await authController.googleRegister(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Account with this email is already linked to a different Google ID.',
      });
    });

    it('should return 401 if google token is invalid for registration', async () => {
      const req = mockRequest({ body: { userData: registerUserData, ...mockGoogleClientData } });
      const res = mockResponse();
      (authService.verifyGoogleToken as jest.Mock).mockResolvedValue(null);

      await authController.googleRegister(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid Google ID token' });
    });

    it('should return 409 if createUser fails due to existing user', async () => {
      const req = mockRequest({ body: { userData: registerUserData, ...mockGoogleClientData } });
      const res = mockResponse();
      (authService.verifyGoogleToken as jest.Mock).mockResolvedValue(mockGooglePayload);
      (userService.getUserByProviderId as jest.Mock).mockResolvedValue(null);
      (userService.getUserByEmail as jest.Mock).mockResolvedValue(null);
      (authService.createUser as jest.Mock).mockRejectedValue(
        new Error('A user already exists with this email'),
      );

      await authController.googleRegister(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: 'A user already exists with this email' });
    });

    it('should return 500 if some unexpected error occurs', async () => {
      const req = mockRequest({ body: { userData: registerUserData, ...mockGoogleClientData } });
      const res = mockResponse();
      const existingUserWithoutGoogleId = {
        ...mockCreatedUser,
        email: mockGooglePayload.email!,
        googleId: undefined,
        _id: testUserId,
      } as unknown as IUser;
      const errUpdate = 'Could not update user with google id';
      const err = 'Google registration failed';
      (authService.verifyGoogleToken as jest.Mock).mockResolvedValue(mockGooglePayload);
      (userService.getUserByProviderId as jest.Mock).mockResolvedValue(null);
      (userService.getUserByEmail as jest.Mock).mockResolvedValue(existingUserWithoutGoogleId);
      (userService.addProviderIdToUser as jest.Mock).mockResolvedValue(null);

      await authController.googleRegister(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: err, error: errUpdate }),
      );
    });
  });

  describe('githubLogin', () => {
    const mockAccessToken = 'mockGithubAccessToken';
    const mockClientEmail = 'test@example.com';
    const mockGithubPayload = {
      id: 'github123',
      login: 'testuser',
      name: 'Test User',
      email: 'payload-email@example.com', // GitHub payload might or might not have email, controller uses clientEmail
    };

    it('should login successfully if user found by githubId', async () => {
      const req = mockRequest({ body: { accessToken: mockAccessToken, email: mockClientEmail } });
      const res = mockResponse();
      (authService.verifyGithubToken as jest.Mock).mockResolvedValue(mockGithubPayload);
      (userService.getUserByProviderId as jest.Mock).mockResolvedValue(mockCreatedUser); // mockCreatedUser has githubId: 'github123'
      (authService.loginGithubUser as jest.Mock).mockResolvedValue({
        user: mockCreatedUser,
        token: mockToken,
      });

      await authController.githubLogin(req, res);

      expect(authService.verifyGithubToken).toHaveBeenCalledWith(mockAccessToken);
      expect(userService.getUserByProviderId).toHaveBeenCalledWith(mockGithubPayload.id, 'github');
      expect(authService.loginGithubUser).toHaveBeenCalledWith(
        mockCreatedUser.username,
        mockCreatedUser.email,
        mockCreatedUser.githubId,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ user: mockCreatedUser, token: mockToken });
    });

    it('should link and login if user found by clientEmail but not githubId', async () => {
      const req = mockRequest({ body: { accessToken: mockAccessToken, email: mockClientEmail } });
      const res = mockResponse();
      const userWithoutGithubId = {
        ...mockCreatedUser,
        email: mockClientEmail,
        githubId: undefined,
        _id: new mongoose.Types.ObjectId().toString(),
      } as unknown as IUser;
      const linkedUser = {
        ...userWithoutGithubId,
        githubId: mockGithubPayload.id.toString(),
      } as IUser; // Ensure ID type consistency

      (authService.verifyGithubToken as jest.Mock).mockResolvedValue(mockGithubPayload);
      (userService.getUserByProviderId as jest.Mock).mockResolvedValue(null);
      (userService.getUserByEmail as jest.Mock).mockResolvedValue(userWithoutGithubId);
      (userService.addProviderIdToUser as jest.Mock).mockResolvedValue(linkedUser);
      (authService.loginGithubUser as jest.Mock).mockResolvedValue({
        user: linkedUser,
        token: mockToken,
      });

      await authController.githubLogin(req, res);

      expect(userService.getUserByEmail).toHaveBeenCalledWith(mockClientEmail);
      expect(userService.addProviderIdToUser).toHaveBeenCalledWith(
        userWithoutGithubId._id,
        mockGithubPayload.id,
        'github',
      );
      expect(authService.loginGithubUser).toHaveBeenCalledWith(
        linkedUser.username,
        linkedUser.email,
        linkedUser.githubId,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'GitHub account successfully linked and logged in.' }),
      );
    });

    it('should return 409 if email is linked to a different githubId', async () => {
      const req = mockRequest({ body: { accessToken: mockAccessToken, email: mockClientEmail } });
      const res = mockResponse();
      const conflictingUser = {
        ...mockCreatedUser,
        email: mockClientEmail,
        githubId: 'differentGithubId123',
      } as IUser;
      (authService.verifyGithubToken as jest.Mock).mockResolvedValue(mockGithubPayload);
      (userService.getUserByProviderId as jest.Mock).mockResolvedValue(null);
      (userService.getUserByEmail as jest.Mock).mockResolvedValue(conflictingUser);

      await authController.githubLogin(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        message: 'This email is already linked to a different GitHub account.',
      });
    });

    it('should return 202 needsMoreData if no user found by githubId or email', async () => {
      const req = mockRequest({ body: { accessToken: mockAccessToken, email: mockClientEmail } });
      const res = mockResponse();
      (authService.verifyGithubToken as jest.Mock).mockResolvedValue(mockGithubPayload);
      (userService.getUserByProviderId as jest.Mock).mockResolvedValue(null);
      (userService.getUserByEmail as jest.Mock).mockResolvedValue(null);

      await authController.githubLogin(req, res);
      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith({
        needsMoreData: true,
        githubPayload: { ...mockGithubPayload, email: mockClientEmail },
      });
    });

    it('should return 401 if github token is invalid', async () => {
      const req = mockRequest({ body: { accessToken: mockAccessToken, email: mockClientEmail } });
      const res = mockResponse();
      (authService.verifyGithubToken as jest.Mock).mockResolvedValue(null);

      await authController.githubLogin(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid GitHub token' });
    });

    it('should return 401 if loginGithubUser returns null (invalid credentials after finding user)', async () => {
      const req = mockRequest({ body: { accessToken: mockAccessToken, email: mockClientEmail } });
      const res = mockResponse();
      (authService.verifyGithubToken as jest.Mock).mockResolvedValue(mockGithubPayload);
      (userService.getUserByProviderId as jest.Mock).mockResolvedValue(mockCreatedUser);
      (authService.loginGithubUser as jest.Mock).mockResolvedValue(null); // Simulate login failure

      await authController.githubLogin(req, res);
      expect(res.status).toHaveBeenCalledWith(401); // Based on controller logic: if (!result) { res.status(401).json({ message: 'Somehow invalid credentials' }); }
      expect(res.json).toHaveBeenCalledWith({ message: 'Somehow invalid credentials' });
    });

    it('should return 500 if addProviderIdToUser fails', async () => {
      const req = mockRequest({ body: { accessToken: mockAccessToken, email: mockClientEmail } });
      const res = mockResponse();
      const userWithoutGithubId = {
        ...mockCreatedUser,
        email: mockClientEmail,
        githubId: undefined,
        _id: new mongoose.Types.ObjectId().toString(),
      } as unknown as IUser;
      (authService.verifyGithubToken as jest.Mock).mockResolvedValue(mockGithubPayload);
      (userService.getUserByProviderId as jest.Mock).mockResolvedValue(null);
      (userService.getUserByEmail as jest.Mock).mockResolvedValue(userWithoutGithubId);
      (userService.addProviderIdToUser as jest.Mock).mockResolvedValue(null); // Simulate failure

      await authController.githubLogin(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to link GitHub account to existing user.',
      });
    });

    it('should return 500 if loginGithubUser fails after linking', async () => {
      const req = mockRequest({ body: { accessToken: mockAccessToken, email: mockClientEmail } });
      const res = mockResponse();
      const userWithoutGithubId = {
        ...mockCreatedUser,
        email: mockClientEmail,
        githubId: undefined,
        _id: new mongoose.Types.ObjectId().toString(),
      } as unknown as IUser;
      const linkedUser = {
        ...userWithoutGithubId,
        githubId: mockGithubPayload.id.toString(),
      } as IUser;
      (authService.verifyGithubToken as jest.Mock).mockResolvedValue(mockGithubPayload);
      (userService.getUserByProviderId as jest.Mock).mockResolvedValue(null);
      (userService.getUserByEmail as jest.Mock).mockResolvedValue(userWithoutGithubId);
      (userService.addProviderIdToUser as jest.Mock).mockResolvedValue(linkedUser);
      (authService.loginGithubUser as jest.Mock).mockResolvedValue(null); // Simulate login failure after linking

      await authController.githubLogin(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Login failed after linking GitHub account.',
      });
    });

    it('should return 500 if an unexpected error occurs (e.g., getUserByProviderId throws)', async () => {
      const req = mockRequest({ body: { accessToken: mockAccessToken, email: mockClientEmail } });
      const res = mockResponse();
      const errorMessage = 'Database connection error';
      (authService.verifyGithubToken as jest.Mock).mockResolvedValue(mockGithubPayload);
      (userService.getUserByProviderId as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await authController.githubLogin(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Github login failed',
        error: errorMessage,
      });
    });
  });

  describe('githubRegister', () => {
    const mockAccessToken = 'mockGithubAccessToken';
    const mockClientEmail = 'gh-user@example.com';
    const mockGithubClientData = { accessToken: mockAccessToken, email: mockClientEmail };
    const mockGithubPayload = { id: 'github789', login: 'ghuser', name: 'GH User' };
    const registerUserData = {
      username: 'newghuser',
      role: UserRole.EXPERT,
      autonomousCommunity: AutonomousComunity.ARAGON,
    };

    it('should register a new user with GitHub successfully', async () => {
      const req = mockRequest({ body: { userData: registerUserData, ...mockGithubClientData } });
      const res = mockResponse();
      (authService.verifyGithubToken as jest.Mock).mockResolvedValue(mockGithubPayload);
      (userService.getUserByProviderId as jest.Mock).mockResolvedValue(null); // No user by githubId
      (userService.getUserByEmail as jest.Mock).mockResolvedValue(null); // No user by email
      const createdUserWithGithub = {
        ...mockCreatedUser,
        ...registerUserData,
        email: mockClientEmail,
        githubId: mockGithubPayload.id.toString(),
      };
      (authService.createUser as jest.Mock).mockResolvedValue({
        user: createdUserWithGithub,
        token: mockToken,
      });

      await authController.githubRegister(req, res);

      expect(authService.verifyGithubToken).toHaveBeenCalledWith(mockGithubClientData.accessToken);
      expect(authService.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          ...registerUserData,
          email: mockClientEmail, // Uses email from client body for registration
          githubId: mockGithubPayload.id,
        }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ user: createdUserWithGithub, token: mockToken });
    });

    it('should link to existing user by email if not linked to githubId for register', async () => {
      const req = mockRequest({ body: { userData: registerUserData, ...mockGithubClientData } });
      const res = mockResponse();
      const existingUserWithoutGithubId = {
        ...mockCreatedUser,
        email: mockClientEmail,
        githubId: undefined,
        _id: new mongoose.Types.ObjectId().toString(),
      } as unknown as IUser;

      // Create a base for linkedUser, then define toObject as a Jest mock
      const baseLinkedUser = {
        ...existingUserWithoutGithubId,
        githubId: mockGithubPayload.id.toString(),
      };
      const linkedUserResponse = {
        ...baseLinkedUser,
        // Use a Jest mock for toObject that returns the desired structure
        toObject: jest.fn().mockImplementation(function (this: any) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { passwordHash, ...rest } = baseLinkedUser; // Use baseLinkedUser to avoid circular ref with this.toObject
          return rest; // Return the plain object without passwordHash, save, or its own toObject
        }),
      } as unknown as IUser;

      (authService.verifyGithubToken as jest.Mock).mockResolvedValue(mockGithubPayload);
      (userService.getUserByProviderId as jest.Mock).mockResolvedValue(null); // No user by githubId
      (userService.getUserByEmail as jest.Mock).mockResolvedValue(existingUserWithoutGithubId);
      (userService.addProviderIdToUser as jest.Mock).mockResolvedValue(linkedUserResponse); // This service returns the user doc
      (genJWT as jest.Mock).mockReturnValue(mockToken); // genJWT is called directly

      await authController.githubRegister(req, res);

      expect(userService.addProviderIdToUser).toHaveBeenCalledWith(
        existingUserWithoutGithubId._id,
        mockGithubPayload.id,
        'github',
      );
      expect(res.status).toHaveBeenCalledWith(200);

      // What the controller's res.json receives after updatedUser.toObject() is called
      const expectedUserObject = linkedUserResponse.toObject();

      expect(res.json).toHaveBeenCalledWith({
        message: 'GitHub account successfully linked to existing user.',
        token: mockToken,
        user: expectedUserObject, // Compare with the result of toObject()
      });
    });

    it('should return 409 if githubId already linked for register', async () => {
      const req = mockRequest({ body: { userData: registerUserData, ...mockGithubClientData } });
      const res = mockResponse();
      (authService.verifyGithubToken as jest.Mock).mockResolvedValue(mockGithubPayload);
      (userService.getUserByProviderId as jest.Mock).mockResolvedValue({
        ...mockCreatedUser,
        githubId: mockGithubPayload.id.toString(),
      } as IUser); // User already exists with this githubId

      await authController.githubRegister(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        message: 'GitHub account already linked to an existing user',
      });
    });

    it('should return 409 if email is linked to a different githubId during register', async () => {
      const req = mockRequest({ body: { userData: registerUserData, ...mockGithubClientData } });
      const res = mockResponse();
      const conflictingUser = {
        ...mockCreatedUser,
        email: mockClientEmail,
        githubId: 'differentGithubId456',
      } as IUser;
      (authService.verifyGithubToken as jest.Mock).mockResolvedValue(mockGithubPayload);
      (userService.getUserByProviderId as jest.Mock).mockResolvedValue(null); // No user by this githubId
      (userService.getUserByEmail as jest.Mock).mockResolvedValue(conflictingUser); // User by email exists with different githubId

      await authController.githubRegister(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Account with this email is already linked to a different GitHub ID.',
      });
    });

    it('should return 400 if email is not provided for github register', async () => {
      const req = mockRequest({
        body: { userData: registerUserData, accessToken: mockAccessToken /* email missing */ },
      });
      const res = mockResponse();
      (authService.verifyGithubToken as jest.Mock).mockResolvedValue(mockGithubPayload); // Token verification might still pass

      await authController.githubRegister(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Email is required for GitHub registration.',
      });
    });

    it('should return 401 if github token is invalid for registration', async () => {
      const req = mockRequest({ body: { userData: registerUserData, ...mockGithubClientData } });
      const res = mockResponse();
      (authService.verifyGithubToken as jest.Mock).mockResolvedValue(null);

      await authController.githubRegister(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid GitHub accessToken' }); // Message from controller
    });

    it('should return 409 if createUser fails due to existing username/email (not GitHub related)', async () => {
      const req = mockRequest({ body: { userData: registerUserData, ...mockGithubClientData } });
      const res = mockResponse();
      const errorMessage = 'A user already exists with this username';
      (authService.verifyGithubToken as jest.Mock).mockResolvedValue(mockGithubPayload);
      (userService.getUserByProviderId as jest.Mock).mockResolvedValue(null);
      (userService.getUserByEmail as jest.Mock).mockResolvedValue(null);
      (authService.createUser as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await authController.githubRegister(req, res);
      expect(res.status).toHaveBeenCalledWith(409); // Controller catches this specific error
      expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
    });

    it('should return 500 if addProviderIdToUser fails during register-linking', async () => {
      const req = mockRequest({ body: { userData: registerUserData, ...mockGithubClientData } });
      const res = mockResponse();
      const existingUserWithoutGithubId = {
        ...mockCreatedUser,
        email: mockClientEmail,
        githubId: undefined,
        _id: new mongoose.Types.ObjectId().toString(),
      } as unknown as IUser;
      (authService.verifyGithubToken as jest.Mock).mockResolvedValue(mockGithubPayload);
      (userService.getUserByProviderId as jest.Mock).mockResolvedValue(null);
      (userService.getUserByEmail as jest.Mock).mockResolvedValue(existingUserWithoutGithubId);
      (userService.addProviderIdToUser as jest.Mock).mockResolvedValue(null); // Simulate failure

      await authController.githubRegister(req, res);
      expect(res.status).toHaveBeenCalledWith(500); // Based on controller: throw new Error('Could not update user with github id');
      expect(res.json).toHaveBeenCalledWith({
        message: 'GitHub registration failed',
        error: 'Could not update user with github id',
      });
    });

    it('should return 500 if an unexpected error occurs during registration', async () => {
      const req = mockRequest({ body: { userData: registerUserData, ...mockGithubClientData } });
      const res = mockResponse();
      const errorMessage = 'Some unexpected service error';
      (authService.verifyGithubToken as jest.Mock).mockResolvedValue(mockGithubPayload);
      (userService.getUserByProviderId as jest.Mock).mockRejectedValue(new Error(errorMessage)); // Simulate error early

      await authController.githubRegister(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'GitHub registration failed',
        error: errorMessage,
      });
    });
  });
});
