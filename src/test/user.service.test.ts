import mongoose, { ObjectId } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcrypt';
import userService from '../services/user.service';
import UserModel, { UserRole, AutonomousComunity, IUser } from '../models/user.model';
import { Types } from 'mongoose';
import authService from '../services/auth.service';
import S3Service from '../services/s3.service'; // Import S3Service
import subscriptionService from '../services/subscription.service';
import ParcelModel, { CropType, IParcel } from '../models/parcel.model';
import MessageModel from '../models/message.model';

jest.mock('../middleware/auth', () => ({
  genJWT: jest.fn().mockReturnValue('mocked-jwt-token'),
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('sharp', () => () => ({
  rotate: jest.fn().mockReturnThis(),
  resize: jest.fn().mockReturnThis(),
  jpeg: jest.fn().mockReturnThis(),
  toBuffer: jest.fn().mockResolvedValue(Buffer.from('mocked-image')),
}));

jest.mock('../services/s3.service');

jest.mock('../services/auth.service', () => ({
  createUser: jest.fn(),
}));

jest.mock('../services/subscription.service', () => ({
  updateUserSubscriptions: jest.fn(),
  removeUserSubscriptions: jest.fn(),
  manageUserSubscriptions: jest.fn(),
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
    await clearDatabase();
  });

  // Limpiar antes de cada test para asegurar aislamiento
  beforeEach(async () => {
    await clearDatabase();

    jest.clearAllMocks(); // Ensure mocks are cleared

    (S3Service.getSignedUrl as jest.Mock).mockResolvedValue('https://mocked-s3-url/specific.jpg');
    (S3Service.getDefaultProfilePictureUrl as jest.Mock).mockResolvedValue(
      'https://mocked-default-profile-url.jpg',
    );
    (S3Service.processImage as jest.Mock).mockResolvedValue(Buffer.from('processed-image'));
    (S3Service.generateUserProfileKey as jest.Mock).mockImplementation(
      (userId, ext) => `users/profile-pictures/${userId}-testkey.${ext}`,
    );
    (S3Service.uploadFile as jest.Mock).mockImplementation(async (buffer, key, _) => key);
    (S3Service.deleteFile as jest.Mock).mockResolvedValue(undefined);

    (authService.createUser as jest.Mock).mockImplementation(async userData => ({
      user: { _id: new Types.ObjectId().toString(), ...userData, parcels: [], loginHistory: [] }, // Simplified mock
      token: 'mocked-auth-token',
    }));
    (subscriptionService.updateUserSubscriptions as jest.Mock).mockResolvedValue(true);
    (subscriptionService.removeUserSubscriptions as jest.Mock).mockResolvedValue(true);
    (subscriptionService.manageUserSubscriptions as jest.Mock).mockResolvedValue(true);
  });

  // Cerrar conexiones después de todos los tests
  afterAll(async () => {
    await clearDatabase(); // Limpieza final
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
    phoneNumber?: string;
    googleId?: string;
    githubId?: string;
  } = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'Password123',
    role: UserRole.SMALL_FARMER,
    autonomousCommunity: AutonomousComunity.ARAGON,
    isAdmin: false,
    phoneNumber: '+34600000001',
  };

  const adminUserData = {
    // Simplified, extend as needed
    ...testUserData,
    username: 'adminuser',
    email: 'admin@example.com',
    password: 'AdminPass123',
    isAdmin: true,
  };

  async function createTestUser(
    userData: Partial<IUser & { password?: string }> = {},
  ): Promise<IUser> {
    const defaultData: Partial<IUser & { password?: string; passwordHash?: string }> = {
      username: `testuser-${new Types.ObjectId().toHexString()}`,
      email: `test-${new Types.ObjectId().toHexString()}@example.com`,
      role: UserRole.SMALL_FARMER,
      autonomousCommunity: AutonomousComunity.ARAGON,
      isAdmin: false,
      parcels: [],
      loginHistory: [],
      ...userData, // User provided data overrides defaults
    };

    if (userData.password && !defaultData.passwordHash) {
      const salt = await bcrypt.genSalt(10);
      defaultData.passwordHash = await bcrypt.hash(userData.password, salt);
    }

    delete defaultData.password; // Ensure raw password is not passed to UserModel.create

    return UserModel.create(defaultData as IUser); // Cast to IUser after removing password
  }

  describe('assignProfilePictureUrl', () => {
    it('should assign S3 signed URL if user has profilePicture', async () => {
      const userObj = { profilePicture: 'user/image.jpg' };
      await userService.assignProfilePictureUrl(userObj);
      expect(S3Service.getSignedUrl).toHaveBeenCalledWith('user/image.jpg');
      expect(userObj.profilePicture).toBe('https://mocked-s3-url/specific.jpg');
    });

    it('should assign default S3 URL if user has no profilePicture', async () => {
      const userObj = { profilePicture: undefined };
      await userService.assignProfilePictureUrl(userObj);
      expect(S3Service.getDefaultProfilePictureUrl).toHaveBeenCalled();
      expect(userObj.profilePicture).toBe('https://mocked-default-profile-url.jpg');
    });

    it('should throw error if S3Service.getSignedUrl fails', async () => {
      const userObj = { profilePicture: 'user/image.jpg' };
      const s3Error = new Error('S3 getSignedUrl failed');
      (S3Service.getSignedUrl as jest.Mock).mockRejectedValueOnce(s3Error);
      await expect(userService.assignProfilePictureUrl(userObj)).rejects.toThrow(
        `Error assigning profile picture url: ${s3Error}`,
      );
    });

    it('should throw error if S3Service.getDefaultProfilePictureUrl fails', async () => {
      const userObj = { profilePicture: undefined };
      const s3Error = new Error('S3 getDefaultProfilePictureUrl failed');
      (S3Service.getDefaultProfilePictureUrl as jest.Mock).mockRejectedValueOnce(s3Error);
      await expect(userService.assignProfilePictureUrl(userObj)).rejects.toThrow(
        `Error assigning profile picture url: ${s3Error}`,
      );
    });
  });

  describe('getUserById', () => {
    it('should find a user by ID', async () => {
      const createdUser = await createTestUser(testUserData);

      const result = await userService.getUserById(
        (createdUser._id as unknown as Types.ObjectId).toString(),
      );

      expect(result).toBeDefined();
      expect(result!.email).toBe(testUserData.email);
      expect(result!.passwordHash).toBeUndefined(); // Password should not be included
    });

    it('should find a user by ID with password when includePassword is true', async () => {
      const createdUser = await createTestUser(testUserData);

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

    it('should throw error if assignProfilePictureUrl fails', async () => {
      const user = await createTestUser({ ...testUserData });
      const assignError = new Error('Failed to assign pic URL');
      // Temporarily make assignProfilePictureUrl throw
      const originalAssign = userService.assignProfilePictureUrl;
      (userService as any).assignProfilePictureUrl = jest.fn().mockRejectedValueOnce(assignError);

      await expect(userService.getUserById(user._id as unknown as string)).rejects.toThrow(
        assignError,
      );

      (userService as any).assignProfilePictureUrl = originalAssign; // Restore
    });

    it('should return null for invalid ID format (already tested, good)', async () => {
      const result = await userService.getUserById('invalid-id');
      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should find a user by email and assign profile picture URL', async () => {
      await createTestUser({ email: 'findme@example.com', profilePicture: 'testpic.jpg' });
      const result = await userService.getUserByEmail('findme@example.com');
      expect(result).toBeDefined();
      expect(result!.email).toBe('findme@example.com');
      expect(S3Service.getSignedUrl).toHaveBeenCalledWith('testpic.jpg');
      expect(result!.profilePicture).toBe('https://mocked-s3-url/specific.jpg');
    });

    it('should return null if user not found by email', async () => {
      const result = await userService.getUserByEmail('notfound@example.com');
      expect(result).toBeNull();
    });

    it('should throw error if assignProfilePictureUrl fails', async () => {
      await createTestUser({ email: 'findme@example.com' });
      const assignError = new Error('Failed to assign pic URL for email user');
      const originalAssign = userService.assignProfilePictureUrl;
      (userService as any).assignProfilePictureUrl = jest.fn().mockRejectedValueOnce(assignError);

      await expect(userService.getUserByEmail('findme@example.com')).rejects.toThrow(assignError);
      (userService as any).assignProfilePictureUrl = originalAssign; // Restore
    });

    it('should throw error if database operation fails', async () => {
      const dbError = new Error('DB find failed');
      const findOneSpy = jest.spyOn(UserModel, 'findOne').mockReturnValue({
        lean: jest.fn().mockRejectedValueOnce(dbError),
      } as any);

      await expect(userService.getUserByEmail('any@example.com')).rejects.toThrow(dbError);
      findOneSpy.mockRestore();
    });
  });

  describe('updateUser', () => {
    it('should update a user successfully', async () => {
      const createdUser = await createTestUser({ username: 'initialName' }); // Ensure user is created
      const updateData = {
        username: 'updateduser',
      };
      const result = await userService.updateUser(
        (createdUser._id as unknown as Types.ObjectId).toString(),
        updateData,
      );
      expect(result).toBeDefined();
      expect(result!.username).toBe(updateData.username);
      const updatedDbUser = await UserModel.findById(createdUser._id);
      expect(updatedDbUser!.username).toBe(updateData.username);
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
      const updatedUser = await UserModel.findById(createdUser._id).select('+passwordHash');

      // Verify the password was hashed
      const isMatch = await bcrypt.compare(updateData.password, updatedUser!.passwordHash!);
      expect(isMatch).toBe(true);
    });

    it('should return null if user not found', async () => {
      const validButNonExistentId = new mongoose.Types.ObjectId().toString();

      const result = await userService.updateUser(validButNonExistentId, { username: 'test' });

      expect(result).toBeNull();
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

    it('should update SNS subscriptions if email changes', async () => {
      const user = await createTestUser({
        email: 'old@example.com',
        phoneNumber: testUserData.phoneNumber,
      });
      await userService.updateUser(user._id as unknown as string, { email: 'new@example.com' });
      expect(subscriptionService.updateUserSubscriptions).toHaveBeenCalledWith(
        'new@example.com',
        user.phoneNumber,
      );
    });

    it('should update SNS subscriptions if phone number changes', async () => {
      const user = await createTestUser({ email: testUserData.email, phoneNumber: 'oldphone' });
      await userService.updateUser(user._id as unknown as string, { phoneNumber: 'newphone' });
      expect(subscriptionService.updateUserSubscriptions).toHaveBeenCalledWith(
        user.email,
        'newphone',
      );
    });

    it('should not fail update if SNS subscription update fails', async () => {
      const user = await createTestUser({ email: 'old@example.com' });
      (subscriptionService.updateUserSubscriptions as jest.Mock).mockRejectedValueOnce(
        new Error('SNS failed'),
      );

      const updatedUser = await userService.updateUser(user as unknown as string, {
        email: 'new@example.com',
      });
      expect(updatedUser).toBeDefined();
      expect(updatedUser!.email).toBe('new@example.com');
    });

    it('should throw error for general database update failure', async () => {
      const user = await createTestUser();
      const dbError = new Error('DB update failed');
      const findOneAndUpdateSpy = jest.spyOn(UserModel, 'findOneAndUpdate').mockReturnValue({
        select: jest.fn().mockRejectedValueOnce(dbError),
      } as any);

      await expect(
        userService.updateUser(user._id as unknown as string, { username: 'newname' }),
      ).rejects.toThrow(dbError);
      findOneAndUpdateSpy.mockRestore();
    });
  });

  describe('updateUserPassword', () => {
    it('should update password successfully for non-OAuth user', async () => {
      const user = await createTestUser({ ...testUserData, password: 'currentPassword123' });
      const result = await userService.updateUserPassword(user._id as unknown as string, {
        currentPassword: 'currentPassword123',
        newPassword: 'newPassword456',
      });
      expect(result).toBe('success');
      const updatedDbUser = await UserModel.findById(user._id).select('+passwordHash');
      const isMatch = await bcrypt.compare('newPassword456', updatedDbUser!.passwordHash!);
      expect(isMatch).toBe(true);
    });

    it('should return "not_found" if user does not exist', async () => {
      const result = await userService.updateUserPassword(new Types.ObjectId().toString(), {
        newPassword: 'newPassword123',
      });
      expect(result).toBe('not_found');
    });

    it('should return "invalid_current_password" if current password does not match for non-OAuth user', async () => {
      const user = await createTestUser({ ...testUserData, password: 'currentPassword123' });
      const result = await userService.updateUserPassword(user._id as unknown as string, {
        currentPassword: 'wrongCurrentPassword',
        newPassword: 'newPassword456',
      });
      expect(result).toBe('invalid_current_password');
    });

    it('should update password successfully for OAuth user without current password', async () => {
      // Ensure no password or passwordHash is set for this OAuth user initially
      const user = await createTestUser({
        ...testUserData,
        email: 'oauth@example.com', // Ensure unique email for this test
        username: 'oauthuserpass', // Ensure unique username
        googleId: 'google123',
        password: undefined, // Explicitly no password
        passwordHash: undefined, // Explicitly no hash
      });
      const result = await userService.updateUserPassword(user._id as unknown as string, {
        newPassword: 'newPasswordOAuth789',
      });
      expect(result).toBe('success'); // This should now pass
      const updatedDbUser = await UserModel.findById(user._id).select('+passwordHash');
      expect(updatedDbUser!.passwordHash).toBeDefined();
      const isMatch = await bcrypt.compare('newPasswordOAuth789', updatedDbUser!.passwordHash!);
      expect(isMatch).toBe(true);
    });

    it('should return "current_password_required" if non-OAuth user tries to update without current password', async () => {
      // User with a passwordHash, implying they are a non-OAuth user or have set a password
      const user = await createTestUser({ ...testUserData, password: 'somePassword123' });
      const result = await userService.updateUserPassword(user._id as unknown as string, {
        // No currentPassword provided
        newPassword: 'newPassword456',
      });
      expect(result).toBe('current_password_required');
    });

    it('should return "unknown_error" if database update fails', async () => {
      const user = await createTestUser({ ...testUserData, password: 'currentPassword123' });
      const dbError = new Error('DB update failed during password change');

      // Spy on UserModel.findOneAndUpdate and make it reject
      // This spy will be active only for this test and restored by afterEach's jest.restoreAllMocks()
      jest.spyOn(UserModel, 'findOneAndUpdate').mockRejectedValueOnce(dbError);

      const result = await userService.updateUserPassword(user._id as unknown as string, {
        currentPassword: 'currentPassword123',
        newPassword: 'newPassword456',
      });

      expect(result).toBe('unknown_error');
    });
  });

  describe('deleteUser', () => {
    it('should successfully soft-delete a user', async () => {
      const createdUser = await createTestUser();
      const result = await userService.deleteUser(createdUser._id as unknown as string);
      expect(result).toBe(true);

      const softDeletedUser = await UserModel.findOne({
        _id: createdUser._id,
        isDeleted: true,
      });

      expect(softDeletedUser).not.toBeNull();
      expect(softDeletedUser!.isDeleted).toBe(true);
      expect(softDeletedUser!.deletedAt).toBeInstanceOf(Date);
    });

    it('should return false if user not found', async () => {
      const validButNonExistentId = new mongoose.Types.ObjectId().toString();
      const result = await userService.deleteUser(validButNonExistentId);
      expect(result).toBe(false);
    });

    it('should successfully soft-delete user, their messages and parcels', async () => {
      const mockSigpacGeoJSONPolygon = {
        type: 'Polygon' as const,
        coordinates: [
          [
            [-1, 40],
            [-1, 41],
            [-2, 41],
            [-2, 40],
            [-1, 40],
          ],
        ],
      };
      const mockSigpacGeoJSONPoint = {
        type: 'Point' as const,
        coordinates: [-0.123, 40.456],
      };
      const parcelDataForDB: Partial<IParcel> = {
        geometry: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: mockSigpacGeoJSONPolygon,
              properties: { name: 'polygon' },
            },
            {
              type: 'Feature',
              geometry: mockSigpacGeoJSONPoint,
              properties: { name: 'pointOnFeature' },
            },
          ],
        },
        crop: CropType.CEREALS,
        provinceCode: 28,
        provinceName: 'Madrid',
        municipalityCode: 79,
        municipalityName: 'Madrid',
        parcelUse: 'Tierras Arables',
        surface: 10,
        coefRegadio: 50,
        altitude: 600,
        products: [],
      };
      const parcel = await ParcelModel.create(parcelDataForDB);
      const user = await createTestUser({ parcels: [parcel._id as ObjectId] });
      const message = await MessageModel.create({
        author: user._id,
        content: 'Msg',
        forum: new Types.ObjectId(),
      });

      const result = await userService.deleteUser(user._id as unknown as string);
      expect(result).toBe(true);

      const dbUser = await UserModel.findOne({
        _id: user._id,
        isDeleted: true,
      });
      expect(dbUser).not.toBeNull();
      expect(dbUser!.isDeleted).toBe(true);
      expect(dbUser!.deletedAt).toBeDefined();
      expect(dbUser!.parcels).toEqual([]);

      const dbMessage = await MessageModel.findById(message._id);
      expect(dbMessage!.isDeleted).toBe(true);

      const dbParcel = await ParcelModel.findById(parcel._id);
      expect(dbParcel).toBeNull();
    });

    it('should throw error if MessageModel.updateMany fails', async () => {
      const user = await createTestUser();
      const dbError = new Error('Message update failed');
      jest.spyOn(MessageModel, 'updateMany').mockRejectedValueOnce(dbError);
      await expect(userService.deleteUser(user._id as unknown as string)).rejects.toThrow(dbError);
    });

    it('should throw error if ParcelModel.deleteMany fails', async () => {
      const user = await createTestUser();
      const dbError = new Error('Parcel delete failed');
      const deleteManySpy = jest.spyOn(ParcelModel, 'deleteMany').mockRejectedValueOnce(dbError);
      await expect(userService.deleteUser(user._id as unknown as string)).rejects.toThrow(dbError);
      deleteManySpy.mockRestore();
    });

    it('should throw error if UserModel.findOneAndUpdate fails during soft delete', async () => {
      const user = await createTestUser();
      const dbError = new Error('User soft delete failed');

      // Spy on findOneAndUpdate and make it reject for this specific call
      const findOneAndUpdateSpy = jest
        .spyOn(UserModel, 'findOneAndUpdate')
        .mockRejectedValueOnce(dbError);

      await expect(userService.deleteUser(user._id as unknown as string)).rejects.toThrow(dbError);

      findOneAndUpdateSpy.mockRestore(); // Restore the original implementation
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
        undefined,
        1,
        16,
      );

      expect(result).toBeDefined();
      expect(result.users.length).toBe(3);
      expect(result.users[0].passwordHash).toBeUndefined(); // Password should not be included
    });

    it('should filter by username, email, role, autCom, isAdmin, hasAppealed', async () => {
      await createTestUser({
        username: 'findme',
        email: 'findme@test.com',
        role: UserRole.EXPERT,
        autonomousCommunity: AutonomousComunity.CATALUGNA,
        isAdmin: true,
      });
      await createTestUser({
        username: 'another',
        isBlocked: true,
        unblockAppeal: { content: 'appeal', createdAt: new Date() },
      });

      let result = await userService.getAllUsers(
        'findme',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        1,
        10,
      );
      expect(result.users.length).toBe(1);
      expect(result.users[0].username).toBe('findme');

      result = await userService.getAllUsers(
        undefined,
        'findme@test.com',
        undefined,
        undefined,
        undefined,
        undefined,
        1,
        10,
      );
      expect(result.users.length).toBe(1);

      result = await userService.getAllUsers(
        undefined,
        undefined,
        UserRole.EXPERT,
        undefined,
        undefined,
        undefined,
        1,
        10,
      );
      expect(result.users.length).toBe(1);

      result = await userService.getAllUsers(
        undefined,
        undefined,
        undefined,
        AutonomousComunity.CATALUGNA,
        undefined,
        undefined,
        1,
        10,
      );
      expect(result.users.length).toBe(1);

      result = await userService.getAllUsers(
        undefined,
        undefined,
        undefined,
        undefined,
        true,
        undefined,
        1,
        10,
      );
      expect(result.users.length).toBe(1);

      result = await userService.getAllUsers(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        true,
        1,
        10,
      );
      expect(result.users.length).toBe(1);
      expect(result.users[0].username).toBe('another');
    });

    it('should throw error if assignProfilePictureUrl fails during Promise.all', async () => {
      await createTestUser({ username: 'user1' });
      await createTestUser({ username: 'user2' });
      const assignError = new Error('Pic assign failed in getAllUsers');

      jest.spyOn(userService, 'assignProfilePictureUrl').mockRejectedValue(assignError);

      await expect(
        userService.getAllUsers(
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          1,
          10,
        ),
      ).rejects.toThrow(assignError);
    });

    it('should throw error if User.find fails', async () => {
      const dbError = new Error('DB find all failed');
      jest.spyOn(UserModel, 'find').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValueOnce(dbError),
      } as any);
      await expect(
        userService.getAllUsers(
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          1,
          10,
        ),
      ).rejects.toThrow(dbError);
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

    it('should throw error if User.countDocuments fails', async () => {
      const dbError = new Error('DB count failed');
      jest.spyOn(UserModel, 'countDocuments').mockRejectedValueOnce(dbError);
      await expect(userService.countUsers()).rejects.toThrow(dbError);
    });
  });

  describe('blockUser', () => {
    it('should block a user succesfully', async () => {
      const user = await createTestUser();
      const result = await userService.blockUser((user._id as any).toString(), 'Razón de bloqueo');
      expect(result).toBe(true);
      const updatedUser = await UserModel.findById((user._id as any).toString());
      expect(updatedUser?.isBlocked).toBe(true);
      expect(updatedUser?.blockReason).toBe('Razón de bloqueo');
    });

    it('should return false if the user does not exist', async () => {
      const result = await userService.blockUser(new mongoose.Types.ObjectId().toString(), 'Razón');
      expect(result).toBe(false);
    });

    it('should not fail blockUser if removeUserSubscriptions fails', async () => {
      const user = await createTestUser({ ...testUserData });
      (subscriptionService.removeUserSubscriptions as jest.Mock).mockRejectedValueOnce(
        new Error('SNS remove failed'),
      );

      const result = await userService.blockUser(user._id as unknown as string, 'reason');
      expect(result).toBe(true); // Block should still succeed
      const dbUser = await UserModel.findById(user._id);
      expect(dbUser!.isBlocked).toBe(true);
    });

    it('should throw error if User.findOneAndUpdate fails during block', async () => {
      const user = await createTestUser();
      const dbError = new Error('DB block update failed');
      // More specific mock for the update operation in blockUser
      const originalFindOneAndUpdate = UserModel.findOneAndUpdate;
      (UserModel.findOneAndUpdate as jest.Mock) = jest
        .fn()
        .mockImplementation((conditions, update) => {
          if (update.$set && update.$set.isBlocked === true) {
            return Promise.reject(dbError);
          }
          return originalFindOneAndUpdate.call(UserModel, conditions, update);
        });
      await expect(userService.blockUser(user._id as unknown as string, 'reason')).rejects.toThrow(
        dbError,
      );
      UserModel.findOneAndUpdate = originalFindOneAndUpdate; // Restore
    });
  });

  describe('unblockUser', () => {
    it('debería desbloquear un usuario correctamente', async () => {
      const user = await createTestUser();
      await userService.blockUser((user._id as any).toString(), 'Razón');
      const result = await userService.unblockUser((user._id as any).toString());
      expect(result).toBe(true);
      const updatedUser = await UserModel.findById((user._id as any).toString());
      expect(updatedUser?.isBlocked).toBe(false);
      expect(updatedUser?.blockReason).toBeUndefined();
    });

    it('debería devolver false si el usuario no existe', async () => {
      const result = await userService.unblockUser(new mongoose.Types.ObjectId().toString());
      expect(result).toBe(false);
    });

    it('should not fail unblockUser if manageUserSubscriptions fails', async () => {
      const user = await createTestUser({ ...testUserData, isBlocked: true });
      (subscriptionService.manageUserSubscriptions as jest.Mock).mockRejectedValueOnce(
        new Error('SNS manage failed'),
      );

      const result = await userService.unblockUser(user._id as unknown as string);
      expect(result).toBe(true); // Unblock should still succeed
      const dbUser = await UserModel.findById(user._id);
      expect(dbUser!.isBlocked).toBe(false);
    });

    it('should throw error if User.findOneAndUpdate fails during unblock', async () => {
      const user = await createTestUser({ isBlocked: true });
      const dbError = new Error('DB unblock update failed');
      const originalFindOneAndUpdate = UserModel.findOneAndUpdate;
      (UserModel.findOneAndUpdate as jest.Mock) = jest
        .fn()
        .mockImplementation((conditions, update) => {
          if (update.$set && update.$set.isBlocked === false) {
            return Promise.reject(dbError);
          }
          return originalFindOneAndUpdate.call(UserModel, conditions, update);
        });
      await expect(userService.unblockUser(user._id as unknown as string)).rejects.toThrow(dbError);
      UserModel.findOneAndUpdate = originalFindOneAndUpdate; // Restore
    });
  });

  describe('requestUnblock', () => {
    it('should register a unblock appelation', async () => {
      const user = await createTestUser();
      const result = await userService.requestUnblock(
        user._id as string,
        'Quiero ser desbloqueado',
      );
      expect(result).toBe(true);
      const updatedUser = await UserModel.findOne({ _id: user._id });
      expect(updatedUser?.unblockAppeal?.content).toBe('Quiero ser desbloqueado');
    });

    it('should return false if the user does not exist', async () => {
      const result = await userService.requestUnblock(
        new mongoose.Types.ObjectId().toString(),
        'apelación',
      );
      expect(result).toBe(false);
    });

    it('should throw error if User.findOneAndUpdate fails', async () => {
      const user = await createTestUser();
      const dbError = new Error('DB request unblock failed');
      jest.spyOn(UserModel, 'findOneAndUpdate').mockRejectedValueOnce(dbError);
      await expect(
        userService.requestUnblock(user._id as unknown as string, 'appeal'),
      ).rejects.toThrow(dbError);
    });
  });

  describe('makeAdmin', () => {
    it('debería convertir a un usuario en admin', async () => {
      const user = await createTestUser();
      const result = await userService.makeAdmin((user._id as any).toString());
      expect(result).toBe(true);
      const updatedUser = await UserModel.findById((user._id as any).toString());
      expect(updatedUser?.isAdmin).toBe(true);
    });

    it('debería devolver false si el usuario no existe', async () => {
      const result = await userService.makeAdmin(new mongoose.Types.ObjectId().toString());
      expect(result).toBe(false);
    });

    it('should throw error if User.findOneAndUpdate fails', async () => {
      const user = await createTestUser();
      const dbError = new Error('DB make admin failed');
      jest.spyOn(UserModel, 'findOneAndUpdate').mockRejectedValueOnce(dbError);
      await expect(userService.makeAdmin(user._id as unknown as string)).rejects.toThrow(dbError);
    });
  });

  describe('refreshUserImages', () => {
    it('should refresh the user profile images', async () => {
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

    it('should use default URL if user has no profile picture', async () => {
      const user1 = await createTestUser({ profilePicture: 'pic1.jpg' });
      const user2 = await createTestUser({ profilePicture: undefined }); // No picture
      const result = await userService.refreshUserImages([
        user1._id as unknown as string,
        user2._id as unknown as string,
      ]);
      expect(S3Service.getSignedUrl).toHaveBeenCalledWith('pic1.jpg');
      expect(S3Service.getDefaultProfilePictureUrl).toHaveBeenCalled();
      expect(result[user1._id as unknown as string]).toBe('https://mocked-s3-url/specific.jpg');
      expect(result[user2._id as unknown as string]).toBe('https://mocked-default-profile-url.jpg');
    });
  });

  describe('uploadProfilePicture', () => {
    const mockFile = {
      buffer: Buffer.from('test-image'),
      originalname: 'test.jpg',
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    it('should upload profile picture successfully', async () => {
      const userData = {
        // Define full user data for clarity
        username: 'testuserUpload',
        email: 'testupload@example.com',
        password: 'Password123',
        role: UserRole.SMALL_FARMER,
        autonomousCommunity: AutonomousComunity.ARAGON,
      };
      // Use createTestUser to ensure the user exists in the DB
      const createdUser = await createTestUser(userData);
      const s3Key = await userService.uploadProfilePicture(String(createdUser._id), mockFile);

      expect(s3Key).toBeDefined();
      expect(s3Key).toContain('users/profile-pictures');
      expect(S3Service.processImage).toHaveBeenCalledWith(mockFile.buffer);
      expect(S3Service.generateUserProfileKey).toHaveBeenCalledWith(String(createdUser._id), 'jpg');
      expect(S3Service.uploadFile).toHaveBeenCalled();

      const updatedDbUser = await UserModel.findById(createdUser._id);
      expect(updatedDbUser!.profilePicture).toBe(s3Key);
    });

    it('should throw if user not found after S3 upload', async () => {
      const userId = new Types.ObjectId().toString();
      (authService.createUser as jest.Mock).mockResolvedValueOnce({ user: { _id: userId } }); // Mock user creation for the test setup

      // Make UserModel.findOneAndUpdate return null as if user was deleted between S3 upload and DB update
      jest.spyOn(UserModel, 'findOneAndUpdate').mockResolvedValueOnce(null);

      await expect(userService.uploadProfilePicture(userId, mockFile)).rejects.toThrow(
        'User not found',
      );
    });

    it('should throw if S3Service.processImage fails', async () => {
      const user = await createTestUser();
      const processError = new Error('Image processing failed');
      (S3Service.processImage as jest.Mock).mockRejectedValueOnce(processError);
      await expect(
        userService.uploadProfilePicture(user._id as unknown as string, mockFile),
      ).rejects.toThrow(processError);
    });

    it('should throw if S3Service.uploadFile fails', async () => {
      const user = await createTestUser();
      const uploadError = new Error('S3 upload failed');
      (S3Service.uploadFile as jest.Mock).mockRejectedValueOnce(uploadError);
      await expect(
        userService.uploadProfilePicture(user._id as unknown as string, mockFile),
      ).rejects.toThrow(uploadError);
    });
  });

  describe('deleteProfilePicture', () => {
    it('debería eliminar la foto de perfil correctamente', async () => {
      const user = await createTestUser({ ...testUserData });
      user.profilePicture = 'mocked-image-key';
      await user.save();
      const result = await userService.deleteProfilePicture((user._id as any).toString());
      expect(result).toBe(true);
      expect(S3Service.deleteFile).toHaveBeenCalledWith('mocked-image-key');
    });

    it('should return false if user has no profile picture', async () => {
      const user = await createTestUser({ profilePicture: undefined });
      const result = await userService.deleteProfilePicture(user._id as unknown as string);
      expect(result).toBe(false);
      expect(S3Service.deleteFile).not.toHaveBeenCalled();
    });

    it('should return false if user not found', async () => {
      const result = await userService.deleteProfilePicture(new Types.ObjectId().toString());
      expect(result).toBe(false);
    });

    it('should throw error if S3Service.deleteFile fails', async () => {
      const user = await createTestUser({ profilePicture: 'pic-to-delete.jpg' });
      const deleteError = new Error('S3 delete failed');
      (S3Service.deleteFile as jest.Mock).mockRejectedValueOnce(deleteError);
      await expect(userService.deleteProfilePicture(user._id as unknown as string)).rejects.toThrow(
        deleteError,
      );
    });
  });

  describe('addProviderIdToUser', () => {
    it('should add googleId to user', async () => {
      const user = await createTestUser();
      const result = await userService.addProviderIdToUser(
        user._id as unknown as string,
        'google123',
        'google',
      );
      expect(result).toBeDefined();
      expect(result!.googleId).toBe('google123');
      const dbUser = await UserModel.findById(user._id);
      expect(dbUser!.googleId).toBe('google123');
    });

    it('should add githubId to user', async () => {
      const user = await createTestUser();
      const result = await userService.addProviderIdToUser(
        user._id as unknown as string,
        'github123',
        'github',
      );
      expect(result).toBeDefined();
      expect(result!.githubId).toBe('github123');
      const dbUser = await UserModel.findById(user._id);
      expect(dbUser!.githubId).toBe('github123');
    });

    it('should return null if user not found', async () => {
      const result = await userService.addProviderIdToUser(
        new Types.ObjectId().toString(),
        'id123',
        'google',
      );
      expect(result).toBeNull();
    });

    it('should return null if database update fails', async () => {
      const user = await createTestUser();
      jest.spyOn(UserModel, 'findOneAndUpdate').mockResolvedValueOnce(null); // Simulate update failure returning null
      const result = await userService.addProviderIdToUser(
        user._id as unknown as string,
        'id123',
        'google',
      );
      expect(result).toBeNull();
    });
  });

  describe('getUserByProviderId', () => {
    it('should find user by googleId and assign profile picture URL', async () => {
      await createTestUser({
        googleId: 'google123',
        email: 'g123@example.com',
        username: 'g123finduser',
      });
      const result = await userService.getUserByProviderId('google123', 'google');
      expect(result).toBeDefined();
      expect(result!.googleId).toBe('google123');
      expect(S3Service.getDefaultProfilePictureUrl).toHaveBeenCalled();
      expect(result!.profilePicture).toBe('https://mocked-default-profile-url.jpg');
    });

    it('should find user by githubId and assign profile picture URL', async () => {
      await createTestUser({
        githubId: 'github123',
        email: 'gh123find@example.com',
        username: 'gh123finduser',
      });
      const result = await userService.getUserByProviderId('github123', 'github');
      expect(result).toBeDefined();
      expect(result!.githubId).toBe('github123');
      expect(S3Service.getDefaultProfilePictureUrl).toHaveBeenCalled();
      expect(result!.profilePicture).toBe('https://mocked-default-profile-url.jpg');
    });

    it('should return null if user not found by providerId', async () => {
      const result = await userService.getUserByProviderId('nonexistent', 'google');
      expect(result).toBeNull();
    });

    it('should throw error if assignProfilePictureUrl fails', async () => {
      await createTestUser({
        googleId: 'google123',
        email: 'g123assignfail@example.com',
        username: 'g123assignfailuser',
      });
      const assignError = new Error('Pic assign failed for provider user');
      jest.spyOn(userService, 'assignProfilePictureUrl').mockRejectedValueOnce(assignError);
      await expect(userService.getUserByProviderId('google123', 'google')).rejects.toThrow(
        'Pic assign failed for provider user',
      );
    });
  });
});
