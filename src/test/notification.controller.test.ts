import { Request, Response } from 'express';
import * as notificationController from '../controllers/notification.controller';
import notificationService from '../services/notification.service';

// Set up environment variables required by lambda.config.ts
process.env.AWS_REGION = 'test-region';
process.env.AWS_ACCESS_KEY_ID = 'test-access-key-id';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-access-key';
process.env.NOTIFICATION_LAMBDA_FUNCTION_NAME = 'test-lambda-function';

// Mock services and logger
jest.mock('../services/notification.service');
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../config/lambda.config', () => ({
  lambdaClient: {
    send: jest.fn().mockResolvedValue({}), // Mock the send method
  },
  LAMBDA_CONFIG: {
    // Provide the LAMBDA_CONFIG object as well if it's used elsewhere
    REGION: process.env.AWS_REGION,
    FUNCTIONS: {
      NOTIFICATION: process.env.NOTIFICATION_LAMBDA_FUNCTION_NAME,
    },
  },
}));

// Helper to create mock Request and Response objects
const mockRequest = (data: { params?: any; body?: any; query?: any } = {}): Request => {
  const req = {} as Partial<Request>;
  req.params = data.params || {};
  req.body = data.body || {};
  req.query = data.query || {};
  return req as Request;
};

const mockResponse = (): Response => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

describe('Notification Controller', () => {
  let req: Request;
  let res: Response;

  beforeEach(() => {
    jest.clearAllMocks(); // Clear all mocks before each test
    req = mockRequest();
    res = mockResponse();
  });

  describe('processWeatherAlerts', () => {
    const mockAlerts = [{ id: 'alert1' }, { id: 'alert2' }];

    it('should process weather alerts and return 200 on success', async () => {
      req = mockRequest({ body: { alerts: mockAlerts } });
      const mockNotificationCount = 2;
      (notificationService.processWeatherAlerts as jest.Mock).mockResolvedValue(
        mockNotificationCount,
      );

      await notificationController.processWeatherAlerts(req, res);

      expect(notificationService.processWeatherAlerts).toHaveBeenCalledWith(mockAlerts);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: `Se procesaron ${mockAlerts.length} alertas y se enviaron ${mockNotificationCount} notificaciones`,
        data: { notificationCount: mockNotificationCount },
      });
    });

    it('should return 400 if alerts are not provided', async () => {
      req = mockRequest({ body: {} }); // No alerts

      await notificationController.processWeatherAlerts(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Se requiere un array de alertas meteorológicas',
      });
      expect(notificationService.processWeatherAlerts).not.toHaveBeenCalled();
    });

    it('should return 400 if alerts is not an array', async () => {
      req = mockRequest({ body: { alerts: 'not-an-array' } });

      await notificationController.processWeatherAlerts(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Se requiere un array de alertas meteorológicas',
      });
      expect(notificationService.processWeatherAlerts).not.toHaveBeenCalled();
    });

    it('should return 500 if notificationService.processWeatherAlerts throws an error', async () => {
      req = mockRequest({ body: { alerts: mockAlerts } });
      const errorMessage = 'Service error';
      (notificationService.processWeatherAlerts as jest.Mock).mockRejectedValue(
        new Error(errorMessage),
      );

      await notificationController.processWeatherAlerts(req, res);

      expect(notificationService.processWeatherAlerts).toHaveBeenCalledWith(mockAlerts);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error al procesar alertas meteorológicas',
        error: errorMessage,
      });
    });
  });

  describe('testNotification', () => {
    const testUserId = 'test-user-id';
    const testNotificationData = { message: 'This is a test' };

    it('should send a test notification and return 200 on success', async () => {
      req = mockRequest({ params: { userId: testUserId }, body: { data: testNotificationData } });
      (notificationService.notifyUser as jest.Mock).mockResolvedValue(true);

      await notificationController.testNotification(req, res);

      expect(notificationService.notifyUser).toHaveBeenCalledWith(testUserId, testNotificationData);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Notificación de prueba enviada correctamente',
      });
    });

    it('should return 400 if userId is not provided', async () => {
      req = mockRequest({ params: {}, body: { data: testNotificationData } }); // No userId

      await notificationController.testNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Se requiere un ID de usuario',
      });
      expect(notificationService.notifyUser).not.toHaveBeenCalled();
    });

    it('should return 400 if data is not provided in the body', async () => {
      req = mockRequest({ params: { userId: testUserId }, body: {} }); // No data

      await notificationController.testNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Se requieren datos para la notificación',
      });
      expect(notificationService.notifyUser).not.toHaveBeenCalled();
    });

    it('should return 404 if notificationService.notifyUser returns false', async () => {
      req = mockRequest({ params: { userId: testUserId }, body: { data: testNotificationData } });
      (notificationService.notifyUser as jest.Mock).mockResolvedValue(false);

      await notificationController.testNotification(req, res);

      expect(notificationService.notifyUser).toHaveBeenCalledWith(testUserId, testNotificationData);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No se pudo enviar la notificación. Verifique que el usuario exista.',
      });
    });

    it('should return 500 if notificationService.notifyUser throws an error', async () => {
      req = mockRequest({ params: { userId: testUserId }, body: { data: testNotificationData } });
      const errorMessage = 'Service error';
      (notificationService.notifyUser as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await notificationController.testNotification(req, res);

      expect(notificationService.notifyUser).toHaveBeenCalledWith(testUserId, testNotificationData);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error al enviar notificación de prueba',
        error: errorMessage,
      });
    });
  });
});
