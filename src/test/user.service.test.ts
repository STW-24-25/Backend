import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcrypt';
import userService from '../services/user.service';
import User, { UserRole, AutonomousComunity } from '../models/user.model';
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

describe('UserService', () => {
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
  const testUserData = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'Password123',
    role: UserRole.SMALL_FARMER,
    autonomousCommunity: AutonomousComunity.ARAGON,
    isAdmin: false,
  };

  const adminUserData = {
    username: 'adminuser',
    email: 'admin@example.com',
    password: 'AdminPass123',
    role: UserRole.EXPERT,
    autonomousCommunity: AutonomousComunity.MADRID,
    isAdmin: true,
  };

  // Helper para crear un usuario directamente en la BD
  async function createTestUser(userData = testUserData) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(userData.password, salt);

    const user = new User({
      ...userData,
      passwordHash,
    });

    return user.save();
  }

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const result = await userService.createUser(testUserData);

      expect(result).toBeDefined();
      expect(result.email).toBe(testUserData.email);
      expect(result.username).toBe(testUserData.username);
      expect(result.role).toBe(testUserData.role);
      expect(result.passwordHash).toBeUndefined(); // Password should not be returned

      // Verify user was saved to DB
      const savedUser = await User.findOne({ email: testUserData.email });
      expect(savedUser).toBeDefined();
      expect(savedUser!.email).toBe(testUserData.email);
    });

    it('should hash the password when creating a user', async () => {
      await userService.createUser(testUserData);

      // Get the user with password
      const savedUser = await User.findOne({ email: testUserData.email }).select('+passwordHash');
      expect(savedUser).toBeDefined();
      expect(savedUser!.passwordHash).toBeDefined();
      expect(savedUser!.passwordHash).not.toBe(testUserData.password); // Password should be hashed

      // Verify the hashed password is valid
      const isMatch = await bcrypt.compare(testUserData.password, savedUser!.passwordHash);
      expect(isMatch).toBe(true);
    });

    it('should throw an error if user with email already exists', async () => {
      // Create user first
      await createTestUser();

      // Try to create again with the same email
      await expect(userService.createUser(testUserData)).rejects.toThrow(
        'User already exists with this email',
      );
    });

    it('should throw an error if user with username already exists', async () => {
      // Create user first
      await createTestUser();

      // Try to create again with the same username but different email
      const userData = { ...testUserData, email: 'different@example.com' };

      await expect(userService.createUser(userData)).rejects.toThrow(
        'User already exists with this username',
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

  describe('findUserByEmail', () => {
    it('should find a user by email', async () => {
      await createTestUser();

      const result = await userService.getUserByEmail(testUserData.email);

      expect(result).toBeDefined();
      expect(result!.email).toBe(testUserData.email);
      expect(result!.passwordHash).toBeUndefined(); // Password should not be included
    });

    it('should find a user by email with password when includePassword is true', async () => {
      await createTestUser();

      const result = await userService.getUserByEmail(testUserData.email, true);

      expect(result).toBeDefined();
      expect(result!.email).toBe(testUserData.email);
      expect(result!.passwordHash).toBeDefined(); // Password should be included
    });

    it('should return null if user not found by email', async () => {
      const result = await userService.getUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findUserByUsername', () => {
    it('should find a user by username', async () => {
      await createTestUser();

      const result = await userService.getUserByUsername(testUserData.username);

      expect(result).toBeDefined();
      expect(result!.username).toBe(testUserData.username);
      expect(result!.passwordHash).toBeUndefined(); // Password should not be included
    });

    it('should find a user by username with password when includePassword is true', async () => {
      await createTestUser();

      const result = await userService.getUserByUsername(testUserData.username, true);

      expect(result).toBeDefined();
      expect(result!.username).toBe(testUserData.username);
      expect(result!.passwordHash).toBeDefined(); // Password should be included
    });

    it('should return null if user not found by username', async () => {
      const result = await userService.getUserByUsername('nonexistentuser');

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

    it('should return null for invalid ID format', async () => {
      const result = await userService.updateUser('invalid-id', { username: 'test' });

      expect(result).toBeNull();
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

    it('should return false for invalid ID format', async () => {
      const result = await userService.deleteUser('invalid-id');

      expect(result).toBe(false);
    });

    it('should return false if user not found', async () => {
      const validButNonExistentId = new mongoose.Types.ObjectId().toString();

      const result = await userService.deleteUser(validButNonExistentId);

      expect(result).toBe(false);
    });
  });

  describe('findAllUsers', () => {
    it('should find all users', async () => {
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

  describe('changePassword', () => {
    it('should change password successfully with correct current password', async () => {
      const createdUser = await createTestUser();

      const result = await userService.changePassword(
        (createdUser._id as unknown as Types.ObjectId).toString(),
        testUserData.password,
        'NewPassword123',
      );

      expect(result).toBe(true);

      // Verify password was updated and is valid
      const updatedUser = await User.findById(createdUser._id).select('+passwordHash');
      const isMatch = await bcrypt.compare('NewPassword123', updatedUser!.passwordHash);
      expect(isMatch).toBe(true);
    });

    it('should return false with incorrect current password', async () => {
      const createdUser = await createTestUser();

      const result = await userService.changePassword(
        (createdUser._id as unknown as Types.ObjectId).toString(),
        'WrongPassword123',
        'NewPassword123',
      );

      expect(result).toBe(false);

      // Verify password was not updated
      const updatedUser = await User.findById(createdUser._id).select('+passwordHash');
      const isMatch = await bcrypt.compare(testUserData.password, updatedUser!.passwordHash);
      expect(isMatch).toBe(true);
    });

    it('should return false for invalid ID format', async () => {
      const result = await userService.changePassword(
        'invalid-id',
        testUserData.password,
        'NewPassword123',
      );

      expect(result).toBe(false);
    });

    it('should return false if user not found', async () => {
      const validButNonExistentId = new mongoose.Types.ObjectId().toString();

      const result = await userService.changePassword(
        (validButNonExistentId as unknown as Types.ObjectId).toString(),
        testUserData.password,
        'NewPassword123',
      );

      expect(result).toBe(false);
    });
  });

  describe('findUsersBySearchCriteria', () => {
    beforeEach(async () => {
      // Create multiple users with different attributes
      await createTestUser(testUserData);
      await createTestUser({
        username: 'johnsmith',
        email: 'john@example.com',
        password: 'Password123',
        role: UserRole.SMALL_FARMER,
        autonomousCommunity: AutonomousComunity.VALENCIA,
        isAdmin: false,
      });
      await createTestUser({
        username: 'janedoe',
        email: 'jane@example.com',
        password: 'Password123',
        role: UserRole.EXPERT,
        autonomousCommunity: AutonomousComunity.MADRID,
        isAdmin: true,
      });
    });

    it('should find users by username (case insensitive)', async () => {
      const result = await userService.getUsersBySearchCriteria({ username: 'john' });

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].username).toBe('johnsmith');
    });

    it('should find users by email (case insensitive)', async () => {
      const result = await userService.getUsersBySearchCriteria({ email: 'JANE' });

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].email).toBe('jane@example.com');
    });

    it('should find users by role', async () => {
      const result = await userService.getUsersBySearchCriteria({ role: UserRole.EXPERT });

      expect(result).toBeDefined();
      expect(result.length).toBe(1); // Solo hay un usuario con rol EXPERT en el beforeEach (janedoe)
      expect(result.some(user => user.username === 'janedoe')).toBe(true);
    });

    it('should find users by autonomousCommunity', async () => {
      const result = await userService.getUsersBySearchCriteria({
        autonomousCommunity: AutonomousComunity.VALENCIA,
      });

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].username).toBe('johnsmith');
    });

    it('should find users by multiple criteria', async () => {
      await createTestUser({
        username: 'expertinadmin',
        email: 'expertinadmin@example.com',
        password: 'Password123',
        role: UserRole.EXPERT,
        autonomousCommunity: AutonomousComunity.CATALUGNA,
        isAdmin: true,
      });

      const result = await userService.getUsersBySearchCriteria({
        role: UserRole.EXPERT,
        isAdmin: true,
      });

      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(result.some(user => user.username === 'janedoe')).toBe(true);
      expect(result.some(user => user.username === 'expertinadmin')).toBe(true);
    });

    it('should return empty array when no users match criteria', async () => {
      const result = await userService.getUsersBySearchCriteria({ username: 'nonexistent' });

      expect(result).toBeDefined();
      expect(result.length).toBe(0);
    });
  });

  describe('validateUserToken', () => {
    it('should validate token for existing user', async () => {
      const createdUser = await createTestUser();

      const result = await userService.validateUserToken(
        (createdUser._id as unknown as Types.ObjectId).toString(),
      );

      expect(result).toBe(true);
    });

    it('should return false for invalid ID format', async () => {
      const result = await userService.validateUserToken('invalid-id');

      expect(result).toBe(false);
    });

    it('should return false if user not found', async () => {
      const validButNonExistentId = new mongoose.Types.ObjectId().toString();

      const result = await userService.validateUserToken(validButNonExistentId);

      expect(result).toBe(false);
    });
  });
});
