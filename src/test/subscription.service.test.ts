import logger from '../utils/logger';

// Mock logger
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Hold the mock send function to control its behavior per test
let mockSnsSend = jest.fn();

// Mock @aws-sdk/client-sns
jest.mock('@aws-sdk/client-sns', () => {
  const originalModule = jest.requireActual('@aws-sdk/client-sns');
  const snsClientSendMockInstance = jest.fn();
  mockSnsSend = snsClientSendMockInstance;
  return {
    ...originalModule,
    SNSClient: jest.fn().mockImplementation(() => ({
      send: mockSnsSend,
    })),
    // Mock command constructors to return their input, which is what send would receive
    SubscribeCommand: jest.fn(input => ({ __commandName: 'SubscribeCommand', ...input })),
    ListSubscriptionsByTopicCommand: jest.fn(input => ({
      __commandName: 'ListSubscriptionsByTopicCommand',
      ...input,
    })),
    UnsubscribeCommand: jest.fn(input => ({ __commandName: 'UnsubscribeCommand', ...input })),
  };
});

// Mock sns.config to control SNS_CONFIG.TOPIC_ARN
let mockTopicArn: string | undefined;
jest.requireActual('../config/sns.config').SNS_CONFIG;

jest.mock('../config/sns.config', () => {
  const originalConfigModule = jest.requireActual('../config/sns.config');
  return {
    // Ensure the service uses the snsClient that's an instance of the mocked SNSClient
    snsClient: new (jest.requireMock('@aws-sdk/client-sns').SNSClient)(),
    SNS_CONFIG: new Proxy(originalConfigModule.SNS_CONFIG, {
      get: (target, prop) => {
        if (prop === 'TOPIC_ARN') {
          return mockTopicArn;
        }
        return target[prop];
      },
    }),
  };
});

import SubscriptionService from '../services/subscription.service';

describe('SubscriptionService', () => {
  const testEmail = 'test@example.com';
  const testPhoneNumber = '+1234567890';
  const testSubscriptionArn = 'arn:aws:sns:us-east-1:123456789012:MyTopic:123-456';
  const defaultTopicArn = 'arn:aws:sns:region:account-id:default-topic-name';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSnsSend.mockReset();
    mockTopicArn = defaultTopicArn; // Default valid topic ARN for most tests
  });

  describe('subscribeEmail', () => {
    it('should subscribe an email successfully and return ARN', async () => {
      mockSnsSend.mockResolvedValueOnce({ SubscriptionArn: testSubscriptionArn });
      const result = await SubscriptionService.subscribeEmail(testEmail);
      expect(result).toBe(testSubscriptionArn);
      expect(mockSnsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Protocol: 'email',
          TopicArn: defaultTopicArn,
          Endpoint: testEmail,
          ReturnSubscriptionArn: true,
        }),
      );
      expect(logger.info).toHaveBeenCalledWith(`Suscribiendo email ${testEmail} al tópico SNS`);
      expect(logger.info).toHaveBeenCalledWith(
        `Email ${testEmail} suscrito correctamente. ARN: ${testSubscriptionArn}`,
      );
    });

    it('should return null if TOPIC_ARN is not configured', async () => {
      mockTopicArn = undefined;
      const result = await SubscriptionService.subscribeEmail(testEmail);
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'No se puede suscribir: SNS_TOPIC_ARN no está configurado',
      );
      expect(mockSnsSend).not.toHaveBeenCalled();
    });

    it('should return null if SNS response does not contain SubscriptionArn', async () => {
      mockSnsSend.mockResolvedValueOnce({}); // No SubscriptionArn
      const result = await SubscriptionService.subscribeEmail(testEmail);
      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(`No se pudo suscribir el email ${testEmail}`);
    });

    it('should return null and log error if snsClient.send throws an error', async () => {
      const error = new Error('SNS API error');
      mockSnsSend.mockRejectedValueOnce(error);
      const result = await SubscriptionService.subscribeEmail(testEmail);
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        `Error al suscribir email ${testEmail} al tópico SNS: ${error}`,
      );
    });
  });

  describe('subscribePhone', () => {
    it('should subscribe a phone number successfully and return ARN', async () => {
      mockSnsSend.mockResolvedValueOnce({ SubscriptionArn: testSubscriptionArn });
      const result = await SubscriptionService.subscribePhone(testPhoneNumber);
      expect(result).toBe(testSubscriptionArn);
      expect(mockSnsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Protocol: 'sms',
          TopicArn: defaultTopicArn,
          Endpoint: testPhoneNumber,
          ReturnSubscriptionArn: true,
        }),
      );
      expect(logger.info).toHaveBeenCalledWith(
        `Suscribiendo teléfono ${testPhoneNumber} al tópico SNS`,
      );
      expect(logger.info).toHaveBeenCalledWith(
        `Teléfono ${testPhoneNumber} suscrito correctamente. ARN: ${testSubscriptionArn}`,
      );
    });

    it('should return null if TOPIC_ARN is not configured', async () => {
      mockTopicArn = undefined;
      const result = await SubscriptionService.subscribePhone(testPhoneNumber);
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'No se puede suscribir: SNS_TOPIC_ARN no está configurado',
      );
    });

    it('should return null if SNS response does not contain SubscriptionArn', async () => {
      mockSnsSend.mockResolvedValueOnce({});
      const result = await SubscriptionService.subscribePhone(testPhoneNumber);
      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        `No se pudo suscribir el teléfono ${testPhoneNumber}`,
      );
    });

    it('should return null and log error if snsClient.send throws an error', async () => {
      const error = new Error('SNS API error');
      mockSnsSend.mockRejectedValueOnce(error);
      const result = await SubscriptionService.subscribePhone(testPhoneNumber);
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        `Error al suscribir teléfono ${testPhoneNumber} al tópico SNS: ${error}`,
      );
    });
  });

  describe('findSubscription', () => {
    it('should find a subscription successfully and return ARN', async () => {
      mockSnsSend.mockResolvedValueOnce({
        Subscriptions: [{ Endpoint: testEmail, SubscriptionArn: testSubscriptionArn }],
      });
      const result = await SubscriptionService.findSubscription(testEmail);
      expect(result).toBe(testSubscriptionArn);
      expect(mockSnsSend).toHaveBeenCalledWith(
        expect.objectContaining({ TopicArn: defaultTopicArn }),
      );
      expect(logger.info).toHaveBeenCalledWith(`Buscando suscripción para ${testEmail}`);
      expect(logger.info).toHaveBeenCalledWith(
        `Suscripción encontrada para ${testEmail}: ${testSubscriptionArn}`,
      );
    });

    it('should return null if TOPIC_ARN is not configured', async () => {
      mockTopicArn = undefined;
      const result = await SubscriptionService.findSubscription(testEmail);
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'No se puede buscar suscripción: SNS_TOPIC_ARN no está configurado',
      );
    });

    it('should return null if no subscriptions are found in response (empty array)', async () => {
      mockSnsSend.mockResolvedValueOnce({ Subscriptions: [] });
      const result = await SubscriptionService.findSubscription(testEmail);
      expect(result).toBeNull();
      expect(logger.info).toHaveBeenCalledWith(`No se encontró suscripción para ${testEmail}`);
    });

    it('should return null if Subscriptions array is undefined in response', async () => {
      mockSnsSend.mockResolvedValueOnce({}); // Subscriptions is undefined
      const result = await SubscriptionService.findSubscription(testEmail);
      expect(result).toBeNull();
      expect(logger.info).toHaveBeenCalledWith(`No se encontró suscripción para ${testEmail}`);
    });

    it('should return null if the specific endpoint is not found among subscriptions', async () => {
      mockSnsSend.mockResolvedValueOnce({
        Subscriptions: [{ Endpoint: 'other@example.com', SubscriptionArn: 'otherArn' }],
      });
      const result = await SubscriptionService.findSubscription(testEmail);
      expect(result).toBeNull();
      expect(logger.info).toHaveBeenCalledWith(`No se encontró suscripción para ${testEmail}`);
    });

    it('should return null if subscription found has no SubscriptionArn (or is pending confirmation)', async () => {
      mockSnsSend.mockResolvedValueOnce({
        Subscriptions: [
          { Endpoint: testEmail /* SubscriptionArn might be "PendingConfirmation" or undefined */ },
        ],
      });
      const result = await SubscriptionService.findSubscription(testEmail);
      expect(result).toBeNull();
      expect(logger.info).toHaveBeenCalledWith(`No se encontró suscripción para ${testEmail}`);
    });

    it('should return null and log error if snsClient.send throws an error', async () => {
      const error = new Error('SNS API error');
      mockSnsSend.mockRejectedValueOnce(error);
      const result = await SubscriptionService.findSubscription(testEmail);
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        `Error al buscar suscripción para ${testEmail}: ${error}`,
      );
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe successfully and return true', async () => {
      mockSnsSend.mockResolvedValueOnce({});
      const result = await SubscriptionService.unsubscribe(testSubscriptionArn);
      expect(result).toBe(true);
      expect(mockSnsSend).toHaveBeenCalledWith(
        expect.objectContaining({ SubscriptionArn: testSubscriptionArn }),
      );
      expect(logger.info).toHaveBeenCalledWith(`Eliminando suscripción: ${testSubscriptionArn}`);
      expect(logger.info).toHaveBeenCalledWith(
        `Suscripción eliminada correctamente: ${testSubscriptionArn}`,
      );
    });

    it('should return false and log error if snsClient.send throws an error', async () => {
      const error = new Error('SNS API error');
      mockSnsSend.mockRejectedValueOnce(error);
      const result = await SubscriptionService.unsubscribe(testSubscriptionArn);
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        `Error al eliminar suscripción ${testSubscriptionArn}: ${error}`,
      );
    });
  });

  describe('manageUserSubscriptions', () => {
    let subscribeEmailSpy: jest.SpyInstance;
    let subscribePhoneSpy: jest.SpyInstance;

    beforeEach(() => {
      // Spy on the service's own methods for these tests
      subscribeEmailSpy = jest
        .spyOn(SubscriptionService, 'subscribeEmail')
        .mockResolvedValue('emailArn');
      subscribePhoneSpy = jest
        .spyOn(SubscriptionService, 'subscribePhone')
        .mockResolvedValue('phoneArn');
    });

    afterEach(() => {
      subscribeEmailSpy.mockRestore();
      subscribePhoneSpy.mockRestore();
    });

    it('should manage subscriptions for email and phone successfully', async () => {
      const result = await SubscriptionService.manageUserSubscriptions(testEmail, testPhoneNumber);
      expect(result).toBe(true);
      expect(subscribeEmailSpy).toHaveBeenCalledWith(testEmail);
      expect(subscribePhoneSpy).toHaveBeenCalledWith(testPhoneNumber);
      expect(logger.info).toHaveBeenCalledWith(
        `Gestionando suscripciones para usuario con email: ${testEmail}`,
      );
    });

    it('should manage subscriptions for email only successfully', async () => {
      const result = await SubscriptionService.manageUserSubscriptions(testEmail);
      expect(result).toBe(true);
      expect(subscribeEmailSpy).toHaveBeenCalledWith(testEmail);
      expect(subscribePhoneSpy).not.toHaveBeenCalled();
    });

    it('should return false and log error if subscribeEmail fails', async () => {
      const error = new Error('Subscribe email failed');
      subscribeEmailSpy.mockRejectedValueOnce(error);
      const result = await SubscriptionService.manageUserSubscriptions(testEmail, testPhoneNumber);
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        `Error al gestionar suscripciones para ${testEmail}: ${error}`,
      );
    });

    it('should return false and log error if subscribePhone fails', async () => {
      const error = new Error('Subscribe phone failed');
      subscribePhoneSpy.mockRejectedValueOnce(error);
      const result = await SubscriptionService.manageUserSubscriptions(testEmail, testPhoneNumber);
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        `Error al gestionar suscripciones para ${testEmail}: ${error}`,
      );
    });
  });

  describe('removeUserSubscriptions', () => {
    let findSubscriptionSpy: jest.SpyInstance;
    let unsubscribeSpy: jest.SpyInstance;

    beforeEach(() => {
      findSubscriptionSpy = jest.spyOn(SubscriptionService, 'findSubscription');
      unsubscribeSpy = jest.spyOn(SubscriptionService, 'unsubscribe').mockResolvedValue(true);
    });

    afterEach(() => {
      findSubscriptionSpy.mockRestore();
      unsubscribeSpy.mockRestore();
    });

    it('should remove subscriptions for email and phone successfully', async () => {
      findSubscriptionSpy.mockResolvedValueOnce('emailArn').mockResolvedValueOnce('phoneArn');
      const result = await SubscriptionService.removeUserSubscriptions(testEmail, testPhoneNumber);
      expect(result).toBe(true);
      expect(findSubscriptionSpy).toHaveBeenCalledWith(testEmail);
      expect(findSubscriptionSpy).toHaveBeenCalledWith(testPhoneNumber);
      expect(unsubscribeSpy).toHaveBeenCalledWith('emailArn');
      expect(unsubscribeSpy).toHaveBeenCalledWith('phoneArn');
      expect(logger.info).toHaveBeenCalledWith(
        `Eliminando suscripciones para usuario con email: ${testEmail}`,
      );
    });

    it('should remove subscription for email only successfully', async () => {
      findSubscriptionSpy.mockResolvedValueOnce('emailArn');
      const result = await SubscriptionService.removeUserSubscriptions(testEmail);
      expect(result).toBe(true);
      expect(findSubscriptionSpy).toHaveBeenCalledWith(testEmail);
      expect(unsubscribeSpy).toHaveBeenCalledWith('emailArn');
      expect(findSubscriptionSpy).toHaveBeenCalledTimes(1);
      expect(unsubscribeSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle cases where email subscription is not found', async () => {
      findSubscriptionSpy.mockResolvedValueOnce(null).mockResolvedValueOnce('phoneArn');
      const result = await SubscriptionService.removeUserSubscriptions(testEmail, testPhoneNumber);
      expect(result).toBe(true);
      expect(unsubscribeSpy).toHaveBeenCalledWith('phoneArn');
      expect(unsubscribeSpy).toHaveBeenCalledTimes(1); // Only for phoneArn
    });

    it('should handle cases where phone subscription is not found', async () => {
      findSubscriptionSpy.mockResolvedValueOnce('emailArn').mockResolvedValueOnce(null);
      const result = await SubscriptionService.removeUserSubscriptions(testEmail, testPhoneNumber);
      expect(result).toBe(true);
      expect(unsubscribeSpy).toHaveBeenCalledWith('emailArn');
      expect(unsubscribeSpy).toHaveBeenCalledTimes(1); // Only for emailArn
    });

    it('should handle cases where neither subscription is found', async () => {
      findSubscriptionSpy.mockResolvedValue(null);
      const result = await SubscriptionService.removeUserSubscriptions(testEmail, testPhoneNumber);
      expect(result).toBe(true);
      expect(unsubscribeSpy).not.toHaveBeenCalled();
    });

    it('should return false and log error if findSubscription (for email) fails', async () => {
      const error = new Error('Find subscription failed');
      findSubscriptionSpy.mockImplementation(async endpoint => {
        if (endpoint === testEmail) throw error;
        return 'phoneArn'; // Assume phone lookup would succeed if called
      });
      const result = await SubscriptionService.removeUserSubscriptions(testEmail, testPhoneNumber);
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        `Error al eliminar suscripciones para ${testEmail}: ${error}`,
      );
    });

    it('should return false and log error if findSubscription (for phone) fails', async () => {
      const error = new Error('Find subscription for phone failed');
      findSubscriptionSpy.mockImplementation(async endpoint => {
        if (endpoint === testEmail) return 'emailArn';
        if (endpoint === testPhoneNumber) throw error;
        return null;
      });
      const result = await SubscriptionService.removeUserSubscriptions(testEmail, testPhoneNumber);
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        `Error al eliminar suscripciones para ${testEmail}: ${error}`,
      );
    });

    it('should return false and log error if unsubscribe (for email) fails', async () => {
      const error = new Error('Unsubscribe failed');
      findSubscriptionSpy.mockResolvedValueOnce('emailArn').mockResolvedValueOnce('phoneArn');
      unsubscribeSpy.mockImplementation(async arn => {
        if (arn === 'emailArn') throw error;
        return true;
      });
      const result = await SubscriptionService.removeUserSubscriptions(testEmail, testPhoneNumber);
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        `Error al eliminar suscripciones para ${testEmail}: ${error}`,
      );
    });

    it('should return false and log error if unsubscribe (for phone) fails', async () => {
      const error = new Error('Unsubscribe phone failed');
      findSubscriptionSpy.mockResolvedValueOnce('emailArn').mockResolvedValueOnce('phoneArn');
      unsubscribeSpy.mockImplementation(async arn => {
        if (arn === 'emailArn') return true;
        if (arn === 'phoneArn') throw error;
        return false;
      });
      const result = await SubscriptionService.removeUserSubscriptions(testEmail, testPhoneNumber);
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        `Error al eliminar suscripciones para ${testEmail}: ${error}`,
      );
    });
  });

  describe('updateUserSubscriptions', () => {
    let removeUserSubscriptionsSpy: jest.SpyInstance;
    let manageUserSubscriptionsSpy: jest.SpyInstance;

    beforeEach(() => {
      removeUserSubscriptionsSpy = jest
        .spyOn(SubscriptionService, 'removeUserSubscriptions')
        .mockResolvedValue(true);
      manageUserSubscriptionsSpy = jest
        .spyOn(SubscriptionService, 'manageUserSubscriptions')
        .mockResolvedValue(true);
    });

    afterEach(() => {
      removeUserSubscriptionsSpy.mockRestore();
      manageUserSubscriptionsSpy.mockRestore();
    });

    it('should update subscriptions successfully', async () => {
      const result = await SubscriptionService.updateUserSubscriptions(testEmail, testPhoneNumber);
      expect(result).toBe(true);
      expect(removeUserSubscriptionsSpy).toHaveBeenCalledWith(testEmail, testPhoneNumber);
      expect(manageUserSubscriptionsSpy).toHaveBeenCalledWith(testEmail, testPhoneNumber);
      expect(logger.info).toHaveBeenCalledWith(
        `Actualizando suscripciones para usuario con email: ${testEmail}`,
      );
    });

    it('should return false and log error if removeUserSubscriptions fails', async () => {
      const error = new Error('Remove failed');
      removeUserSubscriptionsSpy.mockRejectedValueOnce(error); // Simulate error during remove
      const result = await SubscriptionService.updateUserSubscriptions(testEmail, testPhoneNumber);
      expect(result).toBe(false);
      expect(manageUserSubscriptionsSpy).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        `Error al actualizar suscripciones para ${testEmail}: ${error}`,
      );
    });

    it('should return false and log error if manageUserSubscriptions fails', async () => {
      const error = new Error('Manage failed');
      manageUserSubscriptionsSpy.mockRejectedValueOnce(error); // Simulate error during manage
      const result = await SubscriptionService.updateUserSubscriptions(testEmail, testPhoneNumber);
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        `Error al actualizar suscripciones para ${testEmail}: ${error}`,
      );
    });
  });
});
