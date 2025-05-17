import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcrypt';
import authService from '../services/auth.service';
import User, { UserRole, AutonomousComunity } from '../models/user.model';
import { genJWT } from '../middleware/auth';
import dotenv from 'dotenv';

dotenv.config();

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

// Mock de S3Service y sharp para los métodos que lo usan
jest.mock('../services/s3.service', () => ({
  S3Service: {
    uploadFile: jest.fn().mockResolvedValue('users/profile-pictures/mocked-key.jpg'),
    deleteFile: jest.fn().mockResolvedValue(true),
    getSignedUrl: jest.fn().mockResolvedValue('https://mocked-s3-url'),
    generateUserProfileKey: jest.fn().mockReturnValue('users/profile-pictures/mock-key.jpg'),
    processImage: jest.fn().mockResolvedValue(Buffer.from('processed-image')),
    getDefaultProfilePictureUrl: jest.fn().mockResolvedValue('https://mocked-default-profile-url'),
  },
}));

jest.mock('sharp', () => () => ({
  resize: () => ({
    jpeg: () => ({ toBuffer: jest.fn().mockResolvedValue(Buffer.from('mocked-image')) }),
  }),
}));

describe('AuthService', () => {
  let mongoServer: MongoMemoryServer;

  // Limpiar completamente todas las colecciones de la base de datos
  const clearDatabase = async () => {
    const collections = mongoose.connection.collections;

    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  };

  // Configuración inicial antes de todos los tests
  beforeAll(async () => {
    // Crear una instancia de MongoDB en memoria para testing
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    await mongoose.connect(uri);
    await clearDatabase(); // Asegurar que la base de datos está limpia al inicio
  });

  // Limpiar antes de cada test para asegurar aislamiento
  beforeEach(async () => {
    await clearDatabase();
  });

  // Limpiar después de cada test para evitar contaminación
  afterEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();
  });

  // Cerrar conexiones después de todos los tests
  afterAll(async () => {
    await clearDatabase(); // Limpieza final
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Datos de prueba
  const testUserData: {
    username: string;
    email: string;
    password: string;
    role: UserRole;
    autonomousCommunity: AutonomousComunity;
    isAdmin: boolean;
    profilePicture?: string;
  } = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'Password123',
    role: UserRole.SMALL_FARMER,
    autonomousCommunity: AutonomousComunity.ARAGON,
    isAdmin: false,
  };

  // Helper para crear un usuario directamente en la BD
  async function createTestUser(userData: Partial<typeof testUserData> = testUserData) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(userData.password!, salt);

    const user = new User({
      ...userData,
      passwordHash,
    });

    return user.save();
  }

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: UserRole.SMALL_FARMER,
        autonomousCommunity: AutonomousComunity.ARAGON,
      };

      const { user: createdUser, token } = await authService.createUser(userData);

      expect(createdUser).toBeDefined();
      expect(token).toBeDefined();
      expect(createdUser.username).toBe(userData.username);
      expect(createdUser.email).toBe(userData.email);
      expect(createdUser.role).toBe(userData.role);
      expect(createdUser.autonomousCommunity).toBe(userData.autonomousCommunity);
      expect(createdUser.isAdmin).toBe(false);
      expect(createdUser.profilePicture).toBeUndefined();
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
  });

  describe('loginUser', () => {
    it('should login successfully with correct credentials', async () => {
      await createTestUser();

      const result = await authService.loginUser(testUserData.email, testUserData.password);

      expect(result).toBeDefined();
      expect(result!.user.email).toBe(testUserData.email);
      expect(result!.token).toBe('mocked-jwt-token');

      // Verify genJWT was called with correct params
      expect(genJWT).toHaveBeenCalled();
      expect(genJWT).toHaveBeenCalledWith(
        expect.objectContaining({
          email: testUserData.email,
          role: testUserData.role,
        }),
      );
    });

    it('should return null with incorrect email', async () => {
      await createTestUser();

      const result = await authService.loginUser('wrong@example.com', testUserData.password);

      expect(result).toBeNull();
      expect(genJWT).not.toHaveBeenCalled();
    });

    it('should return null with incorrect password', async () => {
      await createTestUser();

      const result = await authService.loginUser(testUserData.email, 'WrongPassword123');

      expect(result).toBeNull();
      expect(genJWT).not.toHaveBeenCalled();
    });

    it('should throw an unexpected error', async () => {
      await createTestUser();

      // Mock User.findOne to throw an error to simulate database failure
      const originalFindOne = User.findOne;
      User.findOne = jest.fn().mockImplementationOnce(() => {
        throw new Error('Database connection error');
      }) as any;

      // Verify that the error is propagated from the service
      await expect(
        authService.loginUser(testUserData.email, testUserData.password),
      ).rejects.toThrow('Database connection error');

      // Restore the original function
      User.findOne = originalFindOne;
    });
  });
});
