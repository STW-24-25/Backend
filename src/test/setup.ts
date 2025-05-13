// Configuración de variables de entorno para tests
process.env.S3_BUCKET_NAME = 'test-bucket';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';

// Mock de S3Client
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
}));

// Limpiar todos los mocks después de cada test
afterEach(() => {
  jest.clearAllMocks();
});
