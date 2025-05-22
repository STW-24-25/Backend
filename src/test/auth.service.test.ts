import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcrypt';
import authService, { CreateUserParams } from '../services/auth.service';
import User, { UserRole, AutonomousComunity, IUser } from '../models/user.model';
import { genJWT } from '../middleware/auth';
import S3Service from '../services/s3.service'; // Import S3Service
import userService from '../services/user.service';
import subscriptionService from '../services/subscription.service';
import { TokenPayload } from 'google-auth-library';
import axios from 'axios';
import { GITHUB_API_URL } from '../services/constants';

// Mock del middleware de autenticación
jest.mock('../middleware/auth', () => ({
  genJWT: jest.fn().mockReturnValue('mocked-jwt-token'),
}));

// Mock del logger para evitar logs durante los tests
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../services/s3.service');

jest.mock('../services/user.service', () => ({
  assignProfilePictureUrl: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../services/subscription.service', () => ({
  manageUserSubscriptions: jest.fn().mockResolvedValue(undefined),
}));

const mockVerifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

jest.mock('axios');

jest.mock('sharp', () => () => ({
  resize: () => ({
    jpeg: () => ({ toBuffer: jest.fn().mockResolvedValue(Buffer.from('mocked-image')) }),
  }),
}));

describe('AuthService', () => {
  let mongoServer: MongoMemoryServer;
  const originalGoogleClientId = process.env.GOOGLE_CLIENT_ID;

  // Limpiar completamente todas las colecciones de la base de datos
  const clearDatabase = async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  };

  // Configuración inicial antes de todos los tests
  beforeAll(async () => {
    // Crear una instancia de MongoDB en memoria para testing
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id'; // Set for tests
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    process.env.GOOGLE_CLIENT_ID = originalGoogleClientId; // Restore original value
  });

  // Limpiar antes de cada test para asegurar aislamiento
  beforeEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();

    (S3Service.getSignedUrl as jest.Mock).mockResolvedValue('https://mocked-s3-url');
    (S3Service.getDefaultProfilePictureUrl as jest.Mock).mockResolvedValue(
      'https://mocked-default-profile-url',
    );
    (S3Service.deleteFile as jest.Mock).mockResolvedValue(undefined);
    (S3Service.generateUserProfileKey as jest.Mock).mockReturnValue(
      'users/profile-pictures/mock-key.jpg',
    );
    (S3Service.processImage as jest.Mock).mockResolvedValue(Buffer.from('processed-image'));
    (S3Service.uploadFile as jest.Mock).mockResolvedValue('users/profile-pictures/mocked-key.jpg');

    (userService.assignProfilePictureUrl as jest.Mock).mockResolvedValue(undefined);
    (subscriptionService.manageUserSubscriptions as jest.Mock).mockResolvedValue(undefined);
    (genJWT as jest.Mock).mockReturnValue('mocked-jwt-token');
    mockVerifyIdToken.mockReset(); // Ensure google-auth-library mock is reset
    (axios.get as jest.Mock).mockReset(); // Ensure axios mock is reset
  });

  const baseTestUserData: CreateUserParams = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'Password123',
    role: UserRole.SMALL_FARMER,
    autonomousCommunity: AutonomousComunity.ARAGON,
  };

  // Datos de prueba
  const testUserData: {
    username: string;
    email: string;
    password: string;
    role: UserRole;
    autonomousCommunity: AutonomousComunity;
    isAdmin: boolean;
  } = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'Password123',
    role: UserRole.SMALL_FARMER,
    autonomousCommunity: AutonomousComunity.ARAGON,
    isAdmin: false,
  };

  const customTestUserParams: CreateUserParams & { isAdmin?: boolean } = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'Password123',
    role: UserRole.SMALL_FARMER,
    autonomousCommunity: AutonomousComunity.ARAGON,
    isAdmin: false,
  };

  async function createTestUser(
    overrides: Partial<IUser & { password?: string }> = {},
  ): Promise<IUser> {
    const dataForDb: Partial<IUser> = {
      // Start with defaults derived from baseTestUserData, mapping to IUser fields
      username: baseTestUserData.username,
      email: baseTestUserData.email,
      role: baseTestUserData.role,
      autonomousCommunity: baseTestUserData.autonomousCommunity,
      isAdmin: false,
      parcels: [],
      loginHistory: [],
    };

    if (overrides.hasOwnProperty('passwordHash')) {
      dataForDb.passwordHash = overrides.passwordHash;
    } else if (overrides.hasOwnProperty('password')) {
      if (overrides.password && overrides.password.length > 0) {
        dataForDb.passwordHash = await bcrypt.hash(overrides.password, 10);
      }
    } else if (baseTestUserData.password) {
      // Fallback if no password-related overrides
      dataForDb.passwordHash = await bcrypt.hash(baseTestUserData.password, 10);
    }

    const finalOverrides = { ...overrides };
    delete finalOverrides.password;
    Object.assign(dataForDb, finalOverrides);

    return User.create(dataForDb);
  }

  describe('createUser', () => {
    it('should create a new user with password successfully', async () => {
      // Uses customTestUserParams which includes a password
      const { user, token } = await authService.createUser(customTestUserParams);
      expect(user.username).toBe(customTestUserParams.username);
      expect(user.email).toBe(customTestUserParams.email);
      expect(token).toBe('mocked-jwt-token');
      const dbUser = await User.findById(user._id).select('+passwordHash');
      expect(dbUser).toBeDefined();
      expect(dbUser!.passwordHash).toBeDefined();
      expect(await bcrypt.compare(customTestUserParams.password!, dbUser!.passwordHash!)).toBe(
        true,
      );
      expect(subscriptionService.manageUserSubscriptions).toHaveBeenCalledWith(
        user.email,
        undefined,
      );
    });

    it('should create a new user with Google ID successfully', async () => {
      const googleUserData: CreateUserParams = {
        ...baseTestUserData,
        password: undefined,
        googleId: 'google123',
      };
      const { user } = await authService.createUser(googleUserData);
      expect(user.googleId).toBe('google123');
      const dbUser = await User.findById(user._id).select('+passwordHash');
      expect(dbUser!.passwordHash).toBeUndefined();
    });

    it('should create a new user with GitHub ID successfully', async () => {
      const githubUserData: CreateUserParams = {
        ...baseTestUserData,
        password: undefined,
        githubId: 'github123',
      };
      const { user } = await authService.createUser(githubUserData);
      expect(user.githubId).toBe('github123');
    });

    it('should hash the password before saving', async () => {
      const userData = {
        username: 'testuser2',
        email: 'test2@example.com',
        password: 'password123',
        role: UserRole.SMALL_FARMER,
        autonomousCommunity: AutonomousComunity.ARAGON,
      };

      await authService.createUser(userData);
      // Obtener el usuario directamente de la BD para verificar el hash
      const dbUser = await User.findOne({ email: userData.email }).select('+passwordHash');
      const isPasswordHashed = await bcrypt.compare(userData.password, dbUser!.passwordHash || '');
      expect(isPasswordHashed).toBe(true);
    });

    it('should throw error if username already exists', async () => {
      const userData = {
        username: 'testuser3',
        email: 'test3@example.com',
        password: 'password123',
        role: UserRole.SMALL_FARMER,
        autonomousCommunity: AutonomousComunity.ARAGON,
      };

      await authService.createUser(userData);

      await expect(authService.createUser(userData)).rejects.toThrow();
    });

    it('should throw an error if user with email already exists', async () => {
      // Create user first
      await createTestUser();

      // Try to create again with the same email
      await expect(authService.createUser(testUserData)).rejects.toThrow(
        'A user already exists with this email',
      );
    });

    it('should throw an error if user with username already exists', async () => {
      // Create user first
      await createTestUser();

      // Try to create again with the same username but different email
      const userData = { ...testUserData, email: 'different@example.com' };

      await expect(authService.createUser(userData)).rejects.toThrow(
        'A user already exists with this username',
      );
    });

    it('should throw error if email already exists for non-deleted user', async () => {
      await authService.createUser(customTestUserParams); // Use params with plain password
      await expect(authService.createUser(customTestUserParams)).rejects.toThrow(
        'A user already exists with this email',
      );
    });

    it('should throw error if username already exists for non-deleted user', async () => {
      await authService.createUser(customTestUserParams);
      const differentEmailData = { ...customTestUserParams, email: 'new@example.com' };
      await expect(authService.createUser(differentEmailData)).rejects.toThrow(
        'A user already exists with this username',
      );
    });

    it('should still create/restore user if manageUserSubscriptions fails', async () => {
      (subscriptionService.manageUserSubscriptions as jest.Mock).mockRejectedValue(
        new Error('SNS error'),
      );
      await expect(authService.createUser(baseTestUserData)).resolves.toBeDefined();
    });
  });

  describe('loginUser', () => {
    it('should login successfully with email', async () => {
      await createTestUser(baseTestUserData);
      const result = await authService.loginUser(
        baseTestUserData.email,
        baseTestUserData.password!,
      );
      expect(result).toBeDefined();
      expect(result!.user.email).toBe(baseTestUserData.email);
      expect(result!.token).toBe('mocked-jwt-token');
      expect(userService.assignProfilePictureUrl).toHaveBeenCalled();
      const dbUser = await User.findById(result!.user._id);
      expect(dbUser!.loginHistory).toHaveLength(1);
    });

    it('should login successfully with username', async () => {
      await createTestUser(baseTestUserData);
      const result = await authService.loginUser(
        baseTestUserData.username,
        baseTestUserData.password!,
      );
      expect(result).toBeDefined();
      expect(result!.user.username).toBe(baseTestUserData.username);
    });

    it('should return null if user not found', async () => {
      const result = await authService.loginUser('nouser@example.com', 'password');
      expect(result).toBeNull();
    });

    it('should return null if password incorrect', async () => {
      await createTestUser(baseTestUserData);
      const result = await authService.loginUser(baseTestUserData.email, 'wrongpassword');
      expect(result).toBeNull();
    });

    it('should return null if user has no passwordHash (OAuth user)', async () => {
      await createTestUser({
        email: customTestUserParams.email,
        googleId: 'google123',
        password: '',
      });
      const result = await authService.loginUser(
        customTestUserParams.email,
        customTestUserParams.password!,
      );
      expect(result).toBeNull();
    });

    it('should still login if assignProfilePictureUrl fails', async () => {
      await createTestUser(baseTestUserData); // User created successfully
      (userService.assignProfilePictureUrl as jest.Mock).mockRejectedValue(new Error('S3 error'));

      const result = await authService.loginUser(
        baseTestUserData.email,
        baseTestUserData.password!,
      );

      // Expect login to be successful despite the assignProfilePictureUrl failure
      expect(result).toBeDefined();
      expect(result!.user.email).toBe(baseTestUserData.email);
      expect(result!.token).toBe('mocked-jwt-token');
    });

    it('should throw error if user.save fails during loginHistory update', async () => {
      await createTestUser(baseTestUserData);
      const saveErrorMessage = 'Database save operation failed';
      const saveSpy = jest
        .spyOn(User.prototype, 'save')
        .mockRejectedValueOnce(new Error(saveErrorMessage));

      await expect(
        authService.loginUser(baseTestUserData.email, baseTestUserData.password!),
      ).rejects.toThrow(saveErrorMessage);

      saveSpy.mockRestore();
    });
  });

  describe('verifyGoogleToken', () => {
    const mockToken = 'validGoogleToken';
    const mockGoogleId = 'googleSubject123'; // This is the 'id' from client, should match payload.sub

    it('should verify token successfully if payload sub matches googleId', async () => {
      const mockPayload = { sub: mockGoogleId, email: 'test@google.com' } as TokenPayload;
      const mockAudience = process.env.GOOGLE_CLIENT_ID;
      mockVerifyIdToken.mockResolvedValue({ getPayload: () => mockPayload });

      const result = await authService.verifyGoogleToken(mockToken, mockGoogleId);
      expect(mockAudience).toBe('test-google-client-id');
      expect(result).toEqual(mockPayload);
      expect(mockVerifyIdToken).toHaveBeenCalledWith({
        idToken: mockToken,
        audience: mockAudience,
      });
    });

    it('should return null if verifyIdToken throws an error', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Verification failed'));
      const result = await authService.verifyGoogleToken(mockToken, mockGoogleId);
      expect(result).toBeNull();
    });

    it('should return null if payload sub mismatches the provided googleId', async () => {
      const mockPayload = { sub: 'differentSubId123', email: 'test@google.com' } as TokenPayload;
      mockVerifyIdToken.mockResolvedValue({ getPayload: () => mockPayload });
      const result = await authService.verifyGoogleToken(mockToken, mockGoogleId); // mockGoogleId is 'googleSubject123'
      expect(result).toBeNull();
    });

    it('should return null if getPayload returns null or undefined', async () => {
      mockVerifyIdToken.mockResolvedValue({ getPayload: () => null });
      let result = await authService.verifyGoogleToken(mockToken, mockGoogleId);
      expect(result).toBeNull();

      mockVerifyIdToken.mockResolvedValue({ getPayload: () => undefined });
      result = await authService.verifyGoogleToken(mockToken, mockGoogleId);
      expect(result).toBeNull();
    });
  });

  describe('loginGoogleUser', () => {
    const googleUserEmail = 'googleuser@example.com';
    const googleUserUsername = 'googleuser';
    const googleUserId = 'google123';

    it('should login Google user successfully', async () => {
      const dbUser = await createTestUser({
        email: googleUserEmail,
        username: googleUserUsername,
        googleId: googleUserId,
        password: '',
      });
      const result = await authService.loginGoogleUser(
        dbUser.username,
        dbUser.email,
        dbUser.googleId!,
      );

      expect(result).toBeDefined();
      expect(result!.user.email).toBe(dbUser.email);
      expect(result!.token).toBe('mocked-jwt-token');
      expect(userService.assignProfilePictureUrl).toHaveBeenCalledWith(
        expect.objectContaining({ email: dbUser.email }),
      );
      const updatedDbUser = await User.findById(result!.user._id);
      expect(updatedDbUser!.loginHistory).toHaveLength(1);
    });

    it('should return null if Google user not found in DB', async () => {
      const result = await authService.loginGoogleUser(
        'nouser',
        'no@example.com',
        'nonexistentgoogleid',
      );
      expect(result).toBeNull();
    });

    it('should still login if assignProfilePictureUrl throws an error', async () => {
      const dbUser = await createTestUser({
        email: googleUserEmail,
        username: googleUserUsername,
        googleId: googleUserId,
        password: '',
      });
      const s3ErrorMessage = 'S3 error during Google login';
      (userService.assignProfilePictureUrl as jest.Mock).mockRejectedValue(
        new Error(s3ErrorMessage),
      );

      const result = await authService.loginGoogleUser(
        dbUser.username,
        dbUser.email,
        dbUser.googleId!,
      );

      expect(result).toBeDefined(); // Login should still succeed
      expect(result!.user.email).toBe(dbUser.email);
      expect(result!.token).toBe('mocked-jwt-token');
      // assignProfilePictureUrl was called and threw, but login proceeded
      expect(userService.assignProfilePictureUrl).toHaveBeenCalled();
    });

    it('should throw error if user.save fails during loginHistory update for Google user', async () => {
      const dbUser = await createTestUser({
        email: googleUserEmail,
        username: googleUserUsername,
        googleId: googleUserId,
        password: '',
      });
      const saveErrorMessage = 'Database save operation failed for Google user';
      const saveSpy = jest
        .spyOn(User.prototype, 'save')
        .mockRejectedValueOnce(new Error(saveErrorMessage));

      await expect(
        authService.loginGoogleUser(dbUser.username, dbUser.email, dbUser.googleId!),
      ).rejects.toThrow(saveErrorMessage);

      saveSpy.mockRestore();
    });
  });

  describe('verifyGithubToken', () => {
    const mockAccessToken = 'validGithubToken';

    it('should verify GitHub token successfully and return mapped payload', async () => {
      const mockGithubApiPayload = { id: 12345, login: 'ghuser', name: 'GH User Name' };
      (axios.get as jest.Mock).mockResolvedValue({ data: mockGithubApiPayload });

      const result = await authService.verifyGithubToken(mockAccessToken);

      expect(result).toEqual({
        id: '12345', // Ensure it's stringified
        login: 'ghuser',
        name: 'GH User Name',
      });
      expect(axios.get).toHaveBeenCalledWith(`${GITHUB_API_URL}/user`, {
        headers: { Authorization: `Bearer ${mockAccessToken}` },
      });
    });

    it('should return null if axios.get throws an error', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('GitHub API error'));
      const result = await authService.verifyGithubToken(mockAccessToken);
      expect(result).toBeNull();
    });

    it('should return null if axios.get returns no data or undefined', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: null });
      let result = await authService.verifyGithubToken(mockAccessToken);
      expect(result).toBeNull();

      (axios.get as jest.Mock).mockResolvedValue({ data: undefined });
      result = await authService.verifyGithubToken(mockAccessToken);
      expect(result).toBeNull();
    });
  });

  describe('loginGithubUser', () => {
    const githubUserEmail = 'githubuser@example.com';
    const githubUserUsername = 'githubuser';
    const githubUserId = 'github123';

    it('should login GitHub user successfully', async () => {
      const dbUser = await createTestUser({
        email: githubUserEmail,
        username: githubUserUsername,
        githubId: githubUserId,
        password: '',
      });
      const result = await authService.loginGithubUser(
        dbUser.username,
        dbUser.email,
        dbUser.githubId!,
      );

      expect(result).toBeDefined();
      expect(result!.user.email).toBe(dbUser.email);
      expect(result!.token).toBe('mocked-jwt-token');
      expect(userService.assignProfilePictureUrl).toHaveBeenCalledWith(
        expect.objectContaining({ email: dbUser.email }),
      );
      const updatedDbUser = await User.findById(result!.user._id);
      expect(updatedDbUser!.loginHistory).toHaveLength(1);
    });

    it('should return null if GitHub user not found in DB', async () => {
      const result = await authService.loginGithubUser(
        'nouser',
        'no@example.com',
        'nonexistentgithubid',
      );
      expect(result).toBeNull();
    });

    it('should still login if assignProfilePictureUrl throws an error', async () => {
      const dbUser = await createTestUser({
        email: githubUserEmail,
        username: githubUserUsername,
        githubId: githubUserId,
        password: '',
      });
      const s3ErrorMessage = 'S3 error during GitHub login';
      (userService.assignProfilePictureUrl as jest.Mock).mockRejectedValue(
        new Error(s3ErrorMessage),
      );

      const result = await authService.loginGithubUser(
        dbUser.username,
        dbUser.email,
        dbUser.githubId!,
      );

      expect(result).toBeDefined(); // Login should still succeed
      expect(result!.user.email).toBe(dbUser.email);
      expect(result!.token).toBe('mocked-jwt-token');
      expect(userService.assignProfilePictureUrl).toHaveBeenCalled();
    });

    it('should throw error if user.save fails during loginHistory update for GitHub user', async () => {
      const dbUser = await createTestUser({
        email: githubUserEmail,
        username: githubUserUsername,
        githubId: githubUserId,
        password: '',
      });
      const saveErrorMessage = 'Database save operation failed for GitHub user';
      const saveSpy = jest
        .spyOn(User.prototype, 'save')
        .mockRejectedValueOnce(new Error(saveErrorMessage));

      await expect(
        authService.loginGithubUser(dbUser.username, dbUser.email, dbUser.githubId!),
      ).rejects.toThrow(saveErrorMessage);

      saveSpy.mockRestore();
    });
  });
});
