import { S3Service } from '../services/s3.service';
import { s3Client } from '../config/s3.config';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Configurar variables de entorno para pruebas
process.env.S3_BUCKET_NAME = 'test-bucket';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

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

// Mock de sharp
jest.mock('sharp', () => {
  return jest.fn().mockImplementation(() => ({
    rotate: jest.fn().mockReturnThis(),
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed image')),
  }));
});

// Importar sharp para poder usarlo en las pruebas
import sharp from 'sharp';

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

    // Limpiar la caché de URLs firmadas antes de cada test
    // @ts-expect-error Accediendo a una propiedad privada para pruebas
    S3Service.signedUrlCache = new Map();
  });

  describe('processImage', () => {
    it('should process an image successfully', async () => {
      const result = await S3Service.processImage(mockFile);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('processed image');
    });

    it('should process an image with custom dimensions', async () => {
      const customWidth = 300;
      const customHeight = 400;

      // Crear un nuevo mock para sharp para este test específico
      const mockSharpInstance = {
        rotate: jest.fn().mockReturnThis(),
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed image')),
      };

      // Reemplazar el mock de sharp para este test
      (sharp as unknown as jest.Mock).mockReturnValue(mockSharpInstance);

      await S3Service.processImage(mockFile, customWidth, customHeight);

      // Verificar que sharp fue llamado con los parámetros correctos
      expect(sharp).toHaveBeenCalledWith(mockFile);
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(
        customWidth,
        customHeight,
        expect.any(Object),
      );
    });
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

      // Asegurarnos de forzar la generación de una nueva URL
      await expect(S3Service.getSignedUrl(mockKey, true)).rejects.toThrow(
        'Failed to generate signed URL',
      );
    });

    it('should return cached URL if available and not expired', async () => {
      // Primera llamada para almacenar en caché
      const url1 = await S3Service.getSignedUrl(mockKey);

      // Reiniciar el mock para verificar que no se llama de nuevo
      (getSignedUrl as jest.Mock).mockClear();

      // Segunda llamada debería usar la caché
      const url2 = await S3Service.getSignedUrl(mockKey);

      expect(url2).toBe(url1);
      expect(getSignedUrl).not.toHaveBeenCalled();
    });

    it('should generate new URL when forceRefresh is true', async () => {
      // Primera llamada para almacenar en caché
      await S3Service.getSignedUrl(mockKey);

      // Reiniciar el mock para verificar que se llama de nuevo
      (getSignedUrl as jest.Mock).mockClear();

      // Segunda llamada con forceRefresh debería regenerar
      await S3Service.getSignedUrl(mockKey, true);

      expect(getSignedUrl).toHaveBeenCalled();
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

    it('should remove the URL from cache when file is deleted', async () => {
      // Primero almacenamos una URL en caché
      await S3Service.getSignedUrl(mockKey);

      // Verificamos que la URL está en caché
      // @ts-expect-error Accediendo a una propiedad privada para pruebas
      expect(S3Service.signedUrlCache.has(mockKey)).toBe(true);

      // Borramos el archivo
      await S3Service.deleteFile(mockKey);

      // Verificamos que la URL ya no está en caché
      // @ts-expect-error Accediendo a una propiedad privada para pruebas
      expect(S3Service.signedUrlCache.has(mockKey)).toBe(false);
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

  describe('cleanExpiredCache', () => {
    it('should remove expired items from cache', () => {
      // @ts-expect-error Accediendo a una propiedad privada para pruebas
      S3Service.signedUrlCache.set(mockKey, {
        url: mockSignedUrl,
        expiresAt: Date.now() - 1000, // Ya expirado
      });

      S3Service.cleanExpiredCache();

      // @ts-expect-error Accediendo a una propiedad privada para pruebas
      expect(S3Service.signedUrlCache.has(mockKey)).toBe(false);
    });

    it('should keep non-expired items in cache', () => {
      // @ts-expect-error Accediendo a una propiedad privada para pruebas
      S3Service.signedUrlCache.set(mockKey, {
        url: mockSignedUrl,
        expiresAt: Date.now() + 60000, // Expira en 1 minuto
      });

      S3Service.cleanExpiredCache();

      // @ts-expect-error Accediendo a una propiedad privada para pruebas
      expect(S3Service.signedUrlCache.has(mockKey)).toBe(true);
    });
  });

  describe('getCacheSize', () => {
    it('should return the correct cache size', () => {
      // @ts-expect-error Accediendo a una propiedad privada para pruebas
      S3Service.signedUrlCache.clear();
      expect(S3Service.getCacheSize()).toBe(0);

      // @ts-expect-error Accediendo a una propiedad privada para pruebas
      S3Service.signedUrlCache.set('key1', { url: 'url1', expiresAt: Date.now() + 60000 });
      // @ts-expect-error Accediendo a una propiedad privada para pruebas
      S3Service.signedUrlCache.set('key2', { url: 'url2', expiresAt: Date.now() + 60000 });

      expect(S3Service.getCacheSize()).toBe(2);
    });
  });

  describe('getDefaultProfilePictureUrl', () => {
    it('should return the default profile picture URL', async () => {
      const url = await S3Service.getDefaultProfilePictureUrl();
      expect(url).toBe(mockSignedUrl);
    });

    it('should throw an error when getting default profile picture URL fails', async () => {
      (getSignedUrl as jest.Mock).mockRejectedValue(new Error('URL generation failed'));

      await expect(S3Service.getDefaultProfilePictureUrl()).rejects.toThrow(
        'Failed to get default profile picture URL',
      );
    });
  });
});

describe('Environment Variables Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should throw error when S3_BUCKET_NAME is not defined', async () => {
    delete process.env.S3_BUCKET_NAME;
    await expect(async () => {
      await import('../config/s3.config');
    }).rejects.toThrow('S3_BUCKET_NAME no está definido en las variables de entorno');
  });

  it('should throw error when AWS_REGION is not defined', async () => {
    delete process.env.AWS_REGION;
    await expect(async () => {
      await import('../config/s3.config');
    }).rejects.toThrow('AWS_REGION no está definido en las variables de entorno');
  });

  it('should throw error when AWS_ACCESS_KEY_ID is not defined', async () => {
    delete process.env.AWS_ACCESS_KEY_ID;
    await expect(async () => {
      await import('../config/s3.config');
    }).rejects.toThrow('AWS_ACCESS_KEY_ID no está definido en las variables de entorno');
  });

  it('should throw error when AWS_SECRET_ACCESS_KEY is not defined', async () => {
    delete process.env.AWS_SECRET_ACCESS_KEY;
    await expect(async () => {
      await import('../config/s3.config');
    }).rejects.toThrow('AWS_SECRET_ACCESS_KEY no está definido en las variables de entorno');
  });

  it('should not throw error when all required environment variables are defined', async () => {
    process.env.S3_BUCKET_NAME = 'test-bucket';
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';

    const importPromise = import('../config/s3.config');
    await expect(importPromise).resolves.not.toThrow();
  });
});
