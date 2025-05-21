// Set up environment variables first
process.env.AWS_REGION = 'test-region';
process.env.AWS_ACCESS_KEY_ID = 'test-access-key-id';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-access-key';
process.env.NOTIFICATION_LAMBDA_FUNCTION_NAME = 'test-lambda-function-name';

import { InvokeCommand } from '@aws-sdk/client-lambda';
import NotificationService from '../services/notification.service';
import UserModel from '../models/user.model';
import ParcelModel from '../models/parcel.model';
import * as turf from '@turf/turf';
import { lambdaClient } from '../config/lambda.config'; // Import to allow mocking its 'send'

// Mock logger
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Mock Models
jest.mock('../models/user.model', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock('../models/parcel.model', () => ({
  find: jest.fn(),
}));

// Mock @turf/turf
jest.mock('@turf/turf', () => ({
  polygon: jest.fn(),
  booleanIntersects: jest.fn(),
}));

// Mock lambdaClient from lambda.config
jest.mock('../config/lambda.config', () => ({
  lambdaClient: {
    send: jest.fn(),
  },
  LAMBDA_CONFIG: {
    REGION: process.env.AWS_REGION,
    FUNCTIONS: {
      NOTIFICATION: process.env.NOTIFICATION_LAMBDA_FUNCTION_NAME,
    },
  },
}));

describe('NotificationService', () => {
  const mockUserId = 'user123';
  const mockUserData = { message: 'Test notification data' };
  const mockUser = {
    _id: mockUserId,
    email: 'test@example.com',
    phoneNumber: '1234567890',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('notifyUser', () => {
    it('should send a notification successfully', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (lambdaClient.send as jest.Mock).mockResolvedValue({});

      const result = await NotificationService.notifyUser(mockUserId, mockUserData);

      expect(UserModel.findById).toHaveBeenCalledWith(mockUserId);
      expect(lambdaClient.send).toHaveBeenCalledWith(expect.any(InvokeCommand));
      const invokeCommandInstance = (lambdaClient.send as jest.Mock).mock.calls[0][0];
      expect(invokeCommandInstance.input.FunctionName).toBe(
        process.env.NOTIFICATION_LAMBDA_FUNCTION_NAME,
      );
      expect(JSON.parse(Buffer.from(invokeCommandInstance.input.Payload).toString())).toEqual({
        userId: mockUserId,
        email: mockUser.email,
        phoneNumber: mockUser.phoneNumber,
        notificationType: 'WEATHER_ALERT',
        data: mockUserData,
      });
      expect(result).toBe(true);
    });

    it('should return false if user is not found', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue(null);
      const result = await NotificationService.notifyUser(mockUserId, mockUserData);
      expect(result).toBe(false);
      expect(lambdaClient.send).not.toHaveBeenCalled();
    });

    it('should return false if user has no email', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue({ ...mockUser, email: null });
      const result = await NotificationService.notifyUser(mockUserId, mockUserData);
      expect(result).toBe(false);
      expect(lambdaClient.send).not.toHaveBeenCalled();
    });

    it('should return false and log error if lambdaClient.send fails', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      const error = new Error('Lambda send failed');
      (lambdaClient.send as jest.Mock).mockRejectedValue(error);
      const result = await NotificationService.notifyUser(mockUserId, mockUserData);
      expect(result).toBe(false);
    });
  });

  describe('processWeatherAlerts', () => {
    const mockAlertProperties = {
      nivel: 'Amarillo',
      fenomeno: 'Viento',
      areaDesc: 'Costa',
      descripcion: 'Vientos fuertes en la costa.',
      severity: 'Moderate',
      certainty: 'Likely',
      urgency: 'Expected',
      instruction: 'Asegure objetos sueltos.',
    };
    const mockAlert = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      },
      properties: mockAlertProperties,
    };
    const mockParcel = (
      id: string,
      intersects: boolean,
      validCoords = true,
      hasPolygonFeature = true,
    ) => ({
      _id: id,
      geometry: {
        features: hasPolygonFeature
          ? [
              {
                properties: { name: 'polygon' },
                geometry: {
                  type: 'Polygon',
                  coordinates: validCoords
                    ? [
                        [
                          [0.5, 0.5],
                          [0.6, 0.5],
                          [0.6, 0.6],
                          [0.5, 0.6],
                          [0.5, 0.5],
                        ],
                      ]
                    : ([[0.5, 0.5]] as any), // invalid for the check
                },
              },
            ]
          : [],
      },
    });
    const mockTurfPolygon = { type: 'Polygon', coordinates: [] }; // Dummy turf polygon

    let notifyUserSpy: jest.SpyInstance;

    beforeEach(() => {
      notifyUserSpy = jest.spyOn(NotificationService, 'notifyUser');
      (turf.polygon as jest.Mock).mockReturnValue(mockTurfPolygon);
    });

    afterEach(() => {
      notifyUserSpy.mockRestore();
    });

    it('should process alerts and send notifications successfully', async () => {
      (ParcelModel.find as jest.Mock).mockResolvedValue([mockParcel('parcel1', true)]);
      (turf.booleanIntersects as jest.Mock).mockReturnValue(true);
      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
      notifyUserSpy.mockResolvedValue(true);

      const result = await NotificationService.processWeatherAlerts([mockAlert as any]);

      expect(ParcelModel.find).toHaveBeenCalled();
      expect(turf.polygon).toHaveBeenCalledWith(mockAlert.geometry.coordinates);
      expect(turf.booleanIntersects).toHaveBeenCalled();
      expect(UserModel.findOne).toHaveBeenCalledWith({ parcels: 'parcel1' });
      expect(notifyUserSpy).toHaveBeenCalledWith(mockUser._id, mockAlert.properties);
      expect(result).toBe(1);
    });

    it('should return 0 if no alerts are provided', async () => {
      const result = await NotificationService.processWeatherAlerts([]);
      expect(result).toBe(0);
      expect(ParcelModel.find).not.toHaveBeenCalled();
    });

    it('should return 0 if no parcels are found', async () => {
      (ParcelModel.find as jest.Mock).mockResolvedValue([]);
      const result = await NotificationService.processWeatherAlerts([mockAlert as any]);
      expect(result).toBe(0);
      expect(turf.booleanIntersects).not.toHaveBeenCalled();
    });

    it('should skip parcel if it has no polygon feature', async () => {
      (ParcelModel.find as jest.Mock).mockResolvedValue([
        mockParcel('parcel1', false, true, false),
      ]);
      const result = await NotificationService.processWeatherAlerts([mockAlert as any]);
      expect(result).toBe(0);
      expect(turf.booleanIntersects).not.toHaveBeenCalled();
    });

    it('should skip parcel if its polygon feature has no coordinates', async () => {
      const parcelWithNoCoords = {
        _id: 'parcelNoCoords',
        geometry: { features: [{ properties: { name: 'polygon' }, geometry: {} }] }, // No coordinates
      };
      (ParcelModel.find as jest.Mock).mockResolvedValue([parcelWithNoCoords]);
      const result = await NotificationService.processWeatherAlerts([mockAlert as any]);
      expect(result).toBe(0);
      expect(turf.polygon).toHaveBeenCalledTimes(1); // For the alert
      expect(turf.booleanIntersects).not.toHaveBeenCalled();
    });

    it('should log warning and skip parcel with invalid coordinate structure', async () => {
      (ParcelModel.find as jest.Mock).mockResolvedValue([mockParcel('parcel1', false, false)]);
      const result = await NotificationService.processWeatherAlerts([mockAlert as any]);
      expect(result).toBe(0);
    });

    it('should not send notification if parcel does not intersect', async () => {
      (ParcelModel.find as jest.Mock).mockResolvedValue([mockParcel('parcel1', false)]);
      (turf.booleanIntersects as jest.Mock).mockReturnValue(false);
      const result = await NotificationService.processWeatherAlerts([mockAlert as any]);
      expect(UserModel.findOne).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });

    it('should not send notification if user for parcel is not found', async () => {
      (ParcelModel.find as jest.Mock).mockResolvedValue([mockParcel('parcel1', true)]);
      (turf.booleanIntersects as jest.Mock).mockReturnValue(true);
      (UserModel.findOne as jest.Mock).mockResolvedValue(null);
      const result = await NotificationService.processWeatherAlerts([mockAlert as any]);
      expect(notifyUserSpy).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });

    it('should count notification if notifyUser fails for one user but succeeds for another', async () => {
      const parcel1 = mockParcel('parcel1', true);
      const parcel2 = mockParcel('parcel2', true);
      const user1 = { _id: 'user1', email: 'user1@example.com' };
      const user2 = { _id: 'user2', email: 'user2@example.com' };

      (ParcelModel.find as jest.Mock).mockResolvedValue([parcel1, parcel2]);
      (turf.booleanIntersects as jest.Mock).mockReturnValue(true);
      (UserModel.findOne as jest.Mock).mockResolvedValueOnce(user1).mockResolvedValueOnce(user2);
      notifyUserSpy
        .mockResolvedValueOnce(false) // Fails for user1
        .mockResolvedValueOnce(true); // Succeeds for user2

      const result = await NotificationService.processWeatherAlerts([mockAlert as any]);
      expect(notifyUserSpy).toHaveBeenCalledTimes(2);
      expect(result).toBe(1);
    });

    it('should log error and continue if processing a parcel geometry fails', async () => {
      const error = new Error('Turf error');
      (ParcelModel.find as jest.Mock).mockResolvedValue([mockParcel('parcel1', true)]);
      (turf.polygon as jest.Mock)
        .mockReturnValueOnce(mockTurfPolygon) // For alert
        .mockImplementationOnce(() => {
          throw error;
        }); // For parcel

      const result = await NotificationService.processWeatherAlerts([mockAlert as any]);
      expect(result).toBe(0); // No notification sent as processing failed for the only parcel
    });

    it('should return 0 and log error if ParcelModel.find fails', async () => {
      const error = new Error('DB error');
      (ParcelModel.find as jest.Mock).mockRejectedValue(error);
      const result = await NotificationService.processWeatherAlerts([mockAlert as any]);
      expect(result).toBe(0);
    });
  });
});
