import { S3Service } from '../services/s3.service';
import { s3Client } from '../config/s3.config';
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Configurar variables de entorno para pruebas
process.env.S3_BUCKET_NAME = 'test-bucket';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';

// Mock de los módulos de AWS
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  PutObjectCommand: jest.fn().mockImplementation(() => ({})),
  GetObjectCommand: jest.fn().mockImplementation(() => ({})),
  DeleteObjectCommand: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('S3Service', () => {
  const mockFile = Buffer.from('test file content');
  const mockKey = 'test/path/file.jpg';
  const mockContentType = 'image/jpeg';
  const mockSignedUrl = 'https://test-bucket.s3.amazonaws.com/test/path/file.jpg?signature=123';

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock de s3Client.send
    (s3Client.send as jest.Mock).mockResolvedValue({});
    // Mock de getSignedUrl
    (getSignedUrl as jest.Mock).mockResolvedValue(mockSignedUrl);
  });

  describe('uploadFile', () => {
    it('should upload a file successfully', async () => {
      await S3Service.uploadFile(mockFile, mockKey, mockContentType);

      expect(s3Client.send).toHaveBeenCalledWith(expect.any(Object));
      expect(s3Client.send).toHaveBeenCalledTimes(1);
    });

    it('should throw an error when upload fails', async () => {
      (s3Client.send as jest.Mock).mockRejectedValue(new Error('Upload failed'));

      await expect(S3Service.uploadFile(mockFile, mockKey, mockContentType)).rejects.toThrow(
        'Failed to upload file to S3',
      );
    });
  });

  describe('getSignedUrl', () => {
    it('should generate a signed URL successfully', async () => {
      const url = await S3Service.getSignedUrl(mockKey);

      expect(getSignedUrl).toHaveBeenCalledWith(s3Client, expect.any(Object), { expiresIn: 3600 });
      expect(url).toBe(mockSignedUrl);
    });

    it('should throw an error when generating signed URL fails', async () => {
      (getSignedUrl as jest.Mock).mockRejectedValue(new Error('URL generation failed'));

      await expect(S3Service.getSignedUrl(mockKey)).rejects.toThrow(
        'Failed to generate signed URL',
      );
    });
  });

  describe('deleteFile', () => {
    it('should delete a file successfully', async () => {
      await S3Service.deleteFile(mockKey);

      expect(s3Client.send).toHaveBeenCalledWith(expect.any(Object));
      expect(s3Client.send).toHaveBeenCalledTimes(1);
    });

    it('should throw an error when deletion fails', async () => {
      (s3Client.send as jest.Mock).mockRejectedValue(new Error('Deletion failed'));

      await expect(S3Service.deleteFile(mockKey)).rejects.toThrow('Failed to delete file from S3');
    });
  });

  describe('generateUserProfileKey', () => {
    it('should generate a valid user profile key', () => {
      const userId = '123';
      const fileExtension = 'jpg';
      const key = S3Service.generateUserProfileKey(userId, fileExtension);

      expect(key).toMatch(/^users\/profile-pictures\/123-\d+\.jpg$/);
    });
  });

  describe('generateProductImageKey', () => {
    it('should generate a valid product image key', () => {
      const productId = '456';
      const fileExtension = 'png';
      const key = S3Service.generateProductImageKey(productId, fileExtension);

      expect(key).toMatch(/^products\/images\/456-\d+\.png$/);
    });
  });
});
