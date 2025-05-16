import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcrypt';
import { UserService } from '../services/user.service';
import User, { UserRole, AutonomousComunity, IUser } from '../models/user.model';
import { genJWT } from '../middleware/auth';
import { Types } from 'mongoose';
import dotenv from 'dotenv';

// Cargar variables de entorno
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

describe('UserService', () => {
  let mongoServer: MongoMemoryServer;
  let userService: UserService;

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
    userService = new UserService();
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

  const adminUserData: {
    username: string;
    email: string;
    password: string;
    role: UserRole;
    autonomousCommunity: AutonomousComunity;
    isAdmin: boolean;
    profilePicture?: string;
  } = {
    username: 'adminuser',
    email: 'admin@example.com',
    password: 'AdminPass123',
    role: UserRole.EXPERT,
    autonomousCommunity: AutonomousComunity.MADRID,
    isAdmin: true,
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

      const createdUser = (await userService.createUser(userData)) as IUser;

      expect(createdUser).toBeDefined();
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

      await userService.createUser(userData);
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

      await userService.createUser(userData);

      await expect(userService.createUser(userData)).rejects.toThrow();
    });

    it('should throw an error if user with email already exists', async () => {
      // Create user first
      await createTestUser();

      // Try to create again with the same email
      await expect(userService.createUser(testUserData)).rejects.toThrow(
        'A user already exists with this email',
      );
    });

    it('should throw an error if user with username already exists', async () => {
      // Create user first
      await createTestUser();

      // Try to create again with the same username but different email
      const userData = { ...testUserData, email: 'different@example.com' };

      await expect(userService.createUser(userData)).rejects.toThrow(
        'A user already exists with this username',
      );
    });
  });

  describe('findUserById', () => {
    it('should find a user by ID', async () => {
      const createdUser = await createTestUser();

      const result = await userService.getUserById(
        (createdUser._id as unknown as Types.ObjectId).toString(),
      );

      expect(result).toBeDefined();
      expect(result!.email).toBe(testUserData.email);
      expect(result!.passwordHash).toBeUndefined(); // Password should not be included
    });

    it('should find a user by ID with password when includePassword is true', async () => {
      const createdUser = await createTestUser();

      const result = await userService.getUserById(
        (createdUser._id as unknown as Types.ObjectId).toString(),
        true,
      );

      expect(result).toBeDefined();
      expect(result!.email).toBe(testUserData.email);
      expect(result!.passwordHash).toBeDefined(); // Password should be included
    });

    it('should return null for invalid ID format', async () => {
      const result = await userService.getUserById('invalid-id');

      expect(result).toBeNull();
    });

    it('should return null if user not found', async () => {
      const validButNonExistentId = new mongoose.Types.ObjectId().toString();

      const result = await userService.getUserById(validButNonExistentId);

      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update a user successfully', async () => {
      const createdUser = await createTestUser();

      const updateData = {
        username: 'updateduser',
        email: 'updated@example.com',
      };

      const result = await userService.updateUser(
        (createdUser._id as unknown as Types.ObjectId).toString(),
        updateData,
      );

      expect(result).toBeDefined();
      expect(result!.username).toBe(updateData.username);
      expect(result!.email).toBe(updateData.email);

      // Verify DB was updated
      const updatedUser = await User.findById(createdUser._id);
      expect(updatedUser!.username).toBe(updateData.username);
      expect(updatedUser!.email).toBe(updateData.email);
    });

    it('should hash password when updating password', async () => {
      const createdUser = await createTestUser();

      const updateData = {
        password: 'NewPassword123',
      };

      await userService.updateUser(
        (createdUser._id as unknown as Types.ObjectId).toString(),
        updateData,
      );

      // Get the user with password
      const updatedUser = await User.findById(createdUser._id).select('+passwordHash');

      // Verify the password was hashed
      const isMatch = await bcrypt.compare(updateData.password, updatedUser!.passwordHash);
      expect(isMatch).toBe(true);
    });

    it('should return null if user not found', async () => {
      const validButNonExistentId = new mongoose.Types.ObjectId().toString();

      const result = await userService.updateUser(validButNonExistentId, { username: 'test' });

      expect(result).toBeNull();
    });

    it('should throw error if updating to an existing email', async () => {
      // Create two users
      const user1 = await createTestUser();
      const user2 = await createTestUser({
        ...adminUserData,
        email: 'unique@example.com',
      });

      // Try to update user2 with user1's email
      await expect(
        userService.updateUser((user2._id as unknown as Types.ObjectId).toString(), {
          email: user1.email,
        }),
      ).rejects.toThrow('Email');
    });

    it('should throw error if updating to an existing username', async () => {
      // Create two users
      const user1 = await createTestUser();
      const user2 = await createTestUser({
        ...adminUserData,
        username: 'uniqueuser',
      });

      // Try to update user2 with user1's username
      await expect(
        userService.updateUser((user2._id as unknown as Types.ObjectId).toString(), {
          username: user1.username,
        }),
      ).rejects.toThrow('Username');
    });
  });

  describe('deleteUser', () => {
    it('should delete a user successfully', async () => {
      const createdUser = await createTestUser();

      const result = await userService.deleteUser(
        (createdUser._id as unknown as Types.ObjectId).toString(),
      );

      expect(result).toBe(true);

      // Verify user was deleted from DB
      const deletedUser = await User.findById(createdUser._id);
      expect(deletedUser).toBeNull();
    });

    it('should return false if user not found', async () => {
      const validButNonExistentId = new mongoose.Types.ObjectId().toString();

      const result = await userService.deleteUser(validButNonExistentId);

      expect(result).toBe(false);
    });
  });

  describe('getAllUsers', () => {
    it('should get all users', async () => {
      // Create multiple users
      await createTestUser(testUserData);
      await createTestUser({
        ...adminUserData,
        username: 'admin1',
        email: 'admin1@example.com',
      });
      await createTestUser({
        ...adminUserData,
        username: 'admin2',
        email: 'admin2@example.com',
      });

      const result = await userService.getAllUsers(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        1,
        16,
      );

      expect(result).toBeDefined();
      expect(result.users.length).toBe(3);
      expect(result.users[0].passwordHash).toBeUndefined(); // Password should not be included
    });
  });

  describe('countUsers', () => {
    it('should count all users correctly', async () => {
      // Create multiple users
      await createTestUser(testUserData);
      await createTestUser({
        ...adminUserData,
        username: 'admin1',
        email: 'admin1@example.com',
      });

      const count = await userService.countUsers();

      expect(count).toBe(2);
    });

    it('should return 0 when no users exist', async () => {
      const count = await userService.countUsers();

      expect(count).toBe(0);
    });
  });

  describe('loginUser', () => {
    it('should login successfully with correct credentials', async () => {
      await createTestUser();

      const result = await userService.loginUser(testUserData.email, testUserData.password);

      expect(result).toBeDefined();
      expect(result!.user.email).toBe(testUserData.email);
      expect(result!.user.passwordHash).toBeUndefined(); // Password should not be included
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

      const result = await userService.loginUser('wrong@example.com', testUserData.password);

      expect(result).toBeNull();
      expect(genJWT).not.toHaveBeenCalled();
    });

    it('should return null with incorrect password', async () => {
      await createTestUser();

      const result = await userService.loginUser(testUserData.email, 'WrongPassword123');

      expect(result).toBeNull();
      expect(genJWT).not.toHaveBeenCalled();
    });
  });

  describe('blockUser', () => {
    it('debería bloquear un usuario correctamente', async () => {
      const user = await createTestUser();
      const result = await userService.blockUser((user._id as any).toString(), 'Razón de bloqueo');
      expect(result).toBe(true);
      const updatedUser = await User.findById((user._id as any).toString());
      expect(updatedUser?.isBlocked).toBe(true);
      expect(updatedUser?.blockReason).toBe('Razón de bloqueo');
    });
    it('debería devolver false si el usuario no existe', async () => {
      const result = await userService.blockUser(new mongoose.Types.ObjectId().toString(), 'Razón');
      expect(result).toBe(false);
    });
  });

  describe('unblockUser', () => {
    it('debería desbloquear un usuario correctamente', async () => {
      const user = await createTestUser();
      await userService.blockUser((user._id as any).toString(), 'Razón');
      const result = await userService.unblockUser((user._id as any).toString());
      expect(result).toBe(true);
      const updatedUser = await User.findById((user._id as any).toString());
      expect(updatedUser?.isBlocked).toBe(false);
      expect(updatedUser?.blockReason).toBeUndefined();
    });
    it('debería devolver false si el usuario no existe', async () => {
      const result = await userService.unblockUser(new mongoose.Types.ObjectId().toString());
      expect(result).toBe(false);
    });
  });

  describe('requestUnblock', () => {
    it('debería registrar una apelación de desbloqueo', async () => {
      const user = await createTestUser();
      const result = await userService.requestUnblock(
        (user._id as any).toString(),
        'Quiero ser desbloqueado',
      );
      expect(result).toBe(true);
      const updatedUser = await User.findById((user._id as any).toString());
      expect(updatedUser?.unblockAppeal?.content).toBe('Quiero ser desbloqueado');
    });
    it('debería devolver false si el usuario no existe', async () => {
      const result = await userService.requestUnblock(
        new mongoose.Types.ObjectId().toString(),
        'apelación',
      );
      expect(result).toBe(false);
    });
  });

  describe('makeAdmin', () => {
    it('debería convertir a un usuario en admin', async () => {
      const user = await createTestUser();
      const result = await userService.makeAdmin((user._id as any).toString());
      expect(result).toBe(true);
      const updatedUser = await User.findById((user._id as any).toString());
      expect(updatedUser?.isAdmin).toBe(true);
    });
    it('debería devolver false si el usuario no existe', async () => {
      const result = await userService.makeAdmin(new mongoose.Types.ObjectId().toString());
      expect(result).toBe(false);
    });
  });

  describe('refreshUserImages', () => {
    it('debería refrescar las imágenes de perfil de los usuarios', async () => {
      const user1 = await createTestUser({ ...testUserData });
      user1.profilePicture = 'mocked-image-key';
      await user1.save();
      const user2 = await createTestUser({
        ...testUserData,
        username: 'otro',
        email: 'otro@example.com',
      });
      user2.profilePicture = 'mocked-image-key';
      await user2.save();
      const result = await userService.refreshUserImages([
        (user1._id as any).toString(),
        (user2._id as any).toString(),
      ]);
      expect(result).toHaveProperty((user1._id as any).toString());
      expect(result).toHaveProperty((user2._id as any).toString());
      expect(result[(user1._id as any).toString()]).toContain('mocked-s3-url');
    });
  });

  describe('uploadProfilePicture', () => {
    it('should upload profile picture successfully', async () => {
      const userData = {
        username: 'testuser4',
        email: 'test4@example.com',
        password: 'password123',
        role: UserRole.SMALL_FARMER,
        autonomousCommunity: AutonomousComunity.ARAGON,
      };

      const createdUser = (await userService.createUser(userData)) as IUser;
      const mockFile = {
        buffer: Buffer.from('test-image'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      const s3Key = await userService.uploadProfilePicture(String(createdUser._id), mockFile);

      expect(s3Key).toBeDefined();
      expect(s3Key).toContain('users/profile-pictures');
    });
  });

  describe('deleteProfilePicture', () => {
    it('debería eliminar la foto de perfil correctamente', async () => {
      const user = await createTestUser({ ...testUserData });
      user.profilePicture = 'mocked-image-key';
      await user.save();
      const result = await userService.deleteProfilePicture((user._id as any).toString());
      expect(result).toBe(true);
    });
  });
});
