import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcrypt';
import * as userController from '../controllers/user.controller';
import User, { UserRole, AutonomousComunity } from '../models/user.model';
import { genJWT } from '../middleware/auth';
import dotenv from 'dotenv';
import { Request, Response } from 'express';

// Cargar variables de entorno
dotenv.config();

// Extender la interfaz Request para incluir el usuario autenticado
interface AuthRequest extends Request {
  user?: {
    id: string;
    username?: string;
    email?: string;
    role?: string;
    isAdmin?: boolean;
  };
}

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

// Mock del servicio de usuario
jest.mock('../services/user.service', () => ({
  createUser: jest.fn().mockImplementation(async userData => {
    // Simular creación de usuario
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(userData.password, salt);

    const user = new User({
      ...userData,
      passwordHash,
      password: undefined,
    });

    await user.save();
    return user;
  }),
  findUserById: jest.fn().mockImplementation(async id => {
    return User.findById(id);
  }),
  updateUser: jest.fn().mockImplementation(async (id, updateData) => {
    return User.findByIdAndUpdate(id, updateData, { new: true });
  }),
  deleteUser: jest.fn().mockImplementation(async id => {
    const result = await User.findByIdAndDelete(id);
    return !!result;
  }),
  loginUser: jest.fn().mockImplementation(async (usernameOrEmail, password) => {
    const user = await User.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    }).select('+passwordHash');

    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return null;

    const token = genJWT({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin,
    });
    return { user, token };
  }),
  findAllUsers: jest.fn().mockImplementation(async (limit, skip) => {
    let query = User.find();
    if (skip) query = query.skip(skip);
    if (limit) query = query.limit(limit);
    return query.exec();
  }),
  countUsers: jest.fn().mockImplementation(async () => {
    return User.countDocuments();
  }),
  changePassword: jest.fn().mockImplementation(async (userId, currentPassword, newPassword) => {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) return false;

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) return false;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await User.findByIdAndUpdate(userId, { passwordHash: hashedPassword });
    return true;
  }),
  findUsersBySearchCriteria: jest.fn().mockImplementation(async searchParams => {
    const query: any = {};

    if (searchParams.username) {
      query.username = { $regex: searchParams.username, $options: 'i' };
    }

    if (searchParams.email) {
      query.email = { $regex: searchParams.email, $options: 'i' };
    }

    if (searchParams.role) {
      query.role = searchParams.role;
    }

    if (searchParams.autonomousCommunity) {
      query.autonomousCommunity = searchParams.autonomousCommunity;
    }

    if (searchParams.isAdmin !== undefined) {
      query.isAdmin = searchParams.isAdmin;
    }

    return User.find(query);
  }),
  validateUserToken: jest.fn().mockImplementation(async userId => {
    const user = await User.findById(userId);
    return !!user;
  }),
  default: {
    createUser: jest.fn(),
    findUserById: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    loginUser: jest.fn(),
    findAllUsers: jest.fn(),
    countUsers: jest.fn(),
    changePassword: jest.fn(),
    findUsersBySearchCriteria: jest.fn(),
    validateUserToken: jest.fn(),
  },
}));

// Mock para Request y Response de Express
const mockRequest = (data: any = {}): Request | AuthRequest => {
  const req: Partial<Request> = {};
  req.body = data.body || {};
  req.params = data.params || {};
  req.query = data.query || {};

  if (data.user) {
    (req as Partial<AuthRequest>).user = data.user;
    return req as AuthRequest;
  }

  return req as Request;
};

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

describe('UserController', () => {
  let mongoServer: MongoMemoryServer;

  // Definir el tipo de documento de usuario
  interface UserDocument extends mongoose.Document {
    _id: mongoose.Types.ObjectId;
    username: string;
    email: string;
    passwordHash: string;
    profilePicture?: string;
    role: UserRole;
    autonomousCommunity: AutonomousComunity;
    isAdmin: boolean;
    createdAt: Date;
  }

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

  // adminUserData está definido pero no usado en este archivo

  // Helper para crear un usuario directamente en la BD
  async function createTestUser(userData = testUserData): Promise<UserDocument> {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(userData.password, salt);

    const user = new User({
      ...userData,
      passwordHash,
    });

    return (await user.save()) as UserDocument;
  }

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const req = mockRequest({ body: testUserData });
      const res = mockResponse();

      await userController.createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();

      // Verify user was saved to DB
      const savedUser = await User.findOne({ email: testUserData.email });
      expect(savedUser).toBeDefined();
      expect(savedUser!.email).toBe(testUserData.email);
    });

    it('should hash the password when creating a user', async () => {
      const req = mockRequest({ body: testUserData });
      const res = mockResponse();

      await userController.createUser(req, res);

      // Get the user with password
      const savedUser = await User.findOne({ email: testUserData.email }).select('+passwordHash');
      expect(savedUser).toBeDefined();
      expect(savedUser!.passwordHash).toBeDefined();
      expect(savedUser!.passwordHash).not.toBe(testUserData.password); // Password should be hashed

      // Verify the hashed password is valid
      const isMatch = await bcrypt.compare(testUserData.password, savedUser!.passwordHash);
      expect(isMatch).toBe(true);
    });

    it('should return error if user with email already exists', async () => {
      // Create user first
      await createTestUser();

      // Try to create again with the same email
      const req = mockRequest({ body: testUserData });
      const res = mockResponse();

      await userController.createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
      // El mensaje específico puede variar dependiendo de cómo se maneje en el servicio
    });

    it('should return error if user with username already exists', async () => {
      // Create user first
      await createTestUser();

      // Try to create again with the same username but different email
      const userData = { ...testUserData, email: 'different@example.com' };
      const req = mockRequest({ body: userData });
      const res = mockResponse();

      await userController.createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
      // El mensaje específico puede variar dependiendo de cómo se maneje en el servicio
    });
  });

  describe('getUser', () => {
    it('should find a user by ID', async () => {
      const createdUser = await createTestUser();
      const userId = createdUser._id.toString();

      const req = mockRequest({ params: { id: userId } });
      const res = mockResponse();

      await userController.getUser(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.user).toBeDefined();
      expect(responseData.user.email).toBe(testUserData.email);
    });

    it('should return 404 if user not found', async () => {
      const validButNonExistentId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({ params: { id: validButNonExistentId } });
      const res = mockResponse();

      await userController.getUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      await createTestUser();

      const req = mockRequest({
        body: {
          usernameOrEmail: testUserData.email,
          password: testUserData.password,
        },
      });
      const res = mockResponse();

      await userController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.token).toBe('mocked-jwt-token');
      expect(responseData.user).toBeDefined();
    });

    it('should fail with 401 for invalid email/username', async () => {
      const req = mockRequest({
        body: {
          usernameOrEmail: 'nonexistent@example.com',
          password: 'anypassword',
        },
      });
      const res = mockResponse();

      await userController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });

    it('should fail with 401 for invalid password', async () => {
      await createTestUser();

      const req = mockRequest({
        body: {
          usernameOrEmail: testUserData.email,
          password: 'wrongpassword',
        },
      });
      const res = mockResponse();

      await userController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });
  });

  describe('updateUser', () => {
    it('should update a user successfully', async () => {
      const createdUser = await createTestUser();
      const userId = createdUser._id.toString();

      const updateData = {
        username: 'updatedusername',
        email: 'updated@example.com',
      };

      const req = mockRequest({
        params: { id: userId },
        body: updateData,
      });
      const res = mockResponse();

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      // Check the user was updated in DB
      const updatedUser = await User.findById(userId);
      expect(updatedUser).toBeDefined();
      expect(updatedUser!.username).toBe(updateData.username);
      expect(updatedUser!.email).toBe(updateData.email);
    });

    it('should return 404 if user not found', async () => {
      const validButNonExistentId = new mongoose.Types.ObjectId().toString();

      const req = mockRequest({
        params: { id: validButNonExistentId },
        body: { username: 'newname' },
      });
      const res = mockResponse();

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });
  });

  describe('deleteUser', () => {
    it('should delete a user successfully', async () => {
      const createdUser = await createTestUser();
      const userId = createdUser._id.toString();

      const req = mockRequest({ params: { id: userId } });
      const res = mockResponse();

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'User deleted successfully' });

      // Verify user was deleted from DB
      const deletedUser = await User.findById(userId);
      expect(deletedUser).toBeNull();
    });

    it('should return 404 if user not found', async () => {
      const validButNonExistentId = new mongoose.Types.ObjectId().toString();

      const req = mockRequest({ params: { id: validButNonExistentId } });
      const res = mockResponse();

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });
  });

  describe('getAllUsers', () => {
    it('should get all users with pagination', async () => {
      // Create multiple users
      await createTestUser();
      await createTestUser({
        ...testUserData,
        username: 'user2',
        email: 'user2@example.com',
      });
      await createTestUser({
        ...testUserData,
        username: 'user3',
        email: 'user3@example.com',
      });

      const req = mockRequest({
        query: { limit: '2', skip: '0' },
      });
      const res = mockResponse();

      await userController.getAllUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.users).toBeDefined();
      expect(responseData.pagination).toBeDefined();
    });
  });

  describe('searchUsers', () => {
    beforeEach(async () => {
      // Preparar usuarios para buscar
      await createTestUser();

      await createTestUser({
        username: 'johnsmith',
        email: 'john@example.com',
        password: 'Password123',
        role: UserRole.MEDIUM_FARMER,
        autonomousCommunity: AutonomousComunity.VALENCIA,
        isAdmin: false,
      });

      await createTestUser({
        username: 'janedoe',
        email: 'jane@example.com',
        password: 'Password123',
        role: UserRole.EXPERT,
        autonomousCommunity: AutonomousComunity.CATALUGNA,
        isAdmin: true,
      });
    });

    it('should find users by search parameters', async () => {
      const req = mockRequest({
        query: {
          username: 'john',
          role: UserRole.MEDIUM_FARMER,
        },
      });
      const res = mockResponse();

      await userController.searchUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('validateToken', () => {
    it('should validate token for existing user', async () => {
      const user = await createTestUser();

      const req = mockRequest({
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
        },
      }) as AuthRequest;

      const res = mockResponse();

      await userController.validateToken(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', async () => {
      // Sin proporcionar user.id
      const req = mockRequest({ user: {} }) as AuthRequest;
      const res = mockResponse();

      await userController.validateToken(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const user = await createTestUser();
      const userId = user._id.toString();

      const req = mockRequest({
        params: { id: userId },
        body: {
          currentPassword: testUserData.password,
          newPassword: 'NewPassword123',
        },
      });
      const res = mockResponse();

      await userController.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Password changed successfully' });
    });

    it('should fail if current password is incorrect', async () => {
      const user = await createTestUser();
      const userId = user._id.toString();

      const req = mockRequest({
        params: { id: userId },
        body: {
          currentPassword: 'WrongPassword',
          newPassword: 'NewPassword123',
        },
      });
      const res = mockResponse();

      await userController.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Current password is incorrect or user not found',
      });
    });
  });
});
