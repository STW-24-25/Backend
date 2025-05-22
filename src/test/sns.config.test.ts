import { SNSClient } from '@aws-sdk/client-sns';

// Mock the logger
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Mock the SNSClient constructor to check how it's called
jest.mock('@aws-sdk/client-sns', () => {
  const originalModule = jest.requireActual('@aws-sdk/client-sns');
  return {
    ...originalModule,
    SNSClient: jest.fn().mockImplementation(config => new originalModule.SNSClient(config)),
  };
});

describe('SNS Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    (SNSClient as jest.Mock).mockClear();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should throw an error if AWS_REGION is not defined', () => {
    delete process.env.AWS_REGION;
    process.env.AWS_ACCESS_KEY_ID = 'test-key-id';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
    expect(() => {
      require('../config/sns.config');
    }).toThrow('AWS_REGION no está definido en las variables de entorno');
  });

  it('should throw an error if AWS_ACCESS_KEY_ID is not defined', () => {
    process.env.AWS_REGION = 'test-region';
    delete process.env.AWS_ACCESS_KEY_ID;
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
    expect(() => {
      require('../config/sns.config');
    }).toThrow('AWS_ACCESS_KEY_ID no está definido en las variables de entorno');
  });

  it('should throw an error if AWS_SECRET_ACCESS_KEY is not defined', () => {
    process.env.AWS_REGION = 'test-region';
    process.env.AWS_ACCESS_KEY_ID = 'test-key-id';
    delete process.env.AWS_SECRET_ACCESS_KEY;
    expect(() => {
      require('../config/sns.config');
    }).toThrow('AWS_SECRET_ACCESS_KEY no está definido en las variables de entorno');
  });
});
