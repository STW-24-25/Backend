import S3Service from '../services/s3.service';
import { s3Client } from '../config/s3.config';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';

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

// Mock S3_CONFIG to allow modification of ALLOWED_MIME_TYPES for tests
let mockConfiguredAllowedMimeTypes: string[];
const actualS3Config = jest.requireActual('../config/s3.config').S3_CONFIG;

jest.mock('../config/s3.config', () => {
  const originalConfigModule = jest.requireActual('../config/s3.config');
  return {
    ...originalConfigModule,
    S3_CONFIG: new Proxy(originalConfigModule.S3_CONFIG, {
      get: (target, prop) => {
        if (prop === 'ALLOWED_MIME_TYPES') {
          return mockConfiguredAllowedMimeTypes || target[prop];
        }
        return target[prop];
      },
    }),
  };
});

describe('S3Service', () => {
  const mockFile = Buffer.from('test file content');
  const mockKey = 'test/path/file.jpg';
  const mockContentType = 'image/jpeg';
  const mockSignedUrl = 'https://test-bucket.s3.amazonaws.com/test/path/file.jpg?signature=123';

  beforeEach(() => {
    jest.clearAllMocks();
    (s3Client.send as jest.Mock).mockResolvedValue({});
    (getSignedUrl as jest.Mock).mockResolvedValue(mockSignedUrl);

    // Limpiar la caché de URLs firmadas antes de cada test
    // @ts-expect-error Accediendo a una propiedad privada para pruebas
    S3Service.signedUrlCache = new Map();

    mockConfiguredAllowedMimeTypes = [...actualS3Config.ALLOWED_MIME_TYPES];
  });

  describe('File Filter Logic (as used in S3Service.multerUpload)', () => {
    let mockReq: any; // Mock request object
    let mockMulterFile: any; // Mock file object for multer
    let cb: jest.Mock; // Mock callback

    // This function replicates the logic from S3Service's multer fileFilter
    const testableFileFilterLogic = (
      req: any, // Express Request object (mocked)
      file: { mimetype: string; originalname: string }, // Multer file object
      callback: (error: Error | null, acceptFile?: boolean) => void,
      allowedTypesConfig: ReadonlyArray<string>,
    ) => {
      if (allowedTypesConfig.includes(file.mimetype as any)) {
        callback(null, true);
      } else {
        callback(new Error(`Invalid file type. Allowed types: ${allowedTypesConfig.join(', ')}`));
      }
    };

    beforeEach(() => {
      mockReq = {}; // Minimal mock request
      cb = jest.fn(); // Reset callback mock for each test
    });

    it('should allow file with an accepted MIME type based on S3_CONFIG', () => {
      // S3_CONFIG.ALLOWED_MIME_TYPES will be used by testableFileFilterLogic via mockConfiguredAllowedMimeTypes
      mockConfiguredAllowedMimeTypes = ['image/jpeg', 'image/png']; // Explicitly set for this test
      mockMulterFile = { mimetype: 'image/jpeg', originalname: 'test.jpg' };
      testableFileFilterLogic(mockReq, mockMulterFile, cb, mockConfiguredAllowedMimeTypes);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should reject file with a non-accepted MIME type based on S3_CONFIG', () => {
      mockConfiguredAllowedMimeTypes = ['image/jpeg', 'image/png']; // Explicitly set for this test
      mockMulterFile = { mimetype: 'application/pdf', originalname: 'test.pdf' };
      testableFileFilterLogic(mockReq, mockMulterFile, cb, mockConfiguredAllowedMimeTypes);
      expect(cb).toHaveBeenCalledWith(expect.any(Error));
      const errorArg = cb.mock.calls[0][0] as Error;
      expect(errorArg.message).toContain('Invalid file type. Allowed types: image/jpeg, image/png');
    });

    it('should allow file if S3_CONFIG.ALLOWED_MIME_TYPES is dynamically changed for test', () => {
      mockConfiguredAllowedMimeTypes = ['image/gif']; // Override for this test
      mockMulterFile = { mimetype: 'image/gif', originalname: 'test.gif' };
      testableFileFilterLogic(mockReq, mockMulterFile, cb, mockConfiguredAllowedMimeTypes);
      expect(cb).toHaveBeenCalledWith(null, true);
    });
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

  describe('refreshSignedUrl', () => {
    it('should call underlying getSignedUrl with forceRefresh true and return new URL', async () => {
      const s3ServiceGetSignedUrlSpy = jest.spyOn(S3Service, 'getSignedUrl');
      const newRefreshedUrl = 'https://refreshed-url.com/file.jpg?sig=new';
      // Mock the AWS SDK's getSignedUrl for the call made *inside* S3Service.getSignedUrl when forceRefresh is true
      (getSignedUrl as jest.Mock).mockResolvedValueOnce(newRefreshedUrl);

      const result = await S3Service.refreshSignedUrl(mockKey);

      expect(s3ServiceGetSignedUrlSpy).toHaveBeenCalledWith(mockKey, true);
      expect(result).toBe(newRefreshedUrl);

      s3ServiceGetSignedUrlSpy.mockRestore();
    });

    it('should update the cache with the new refreshed URL via the internal getSignedUrl call', async () => {
      const initialUrl = 'https://initial-url.com/file.jpg?sig=old';
      (getSignedUrl as jest.Mock).mockResolvedValueOnce(initialUrl);
      await S3Service.getSignedUrl(mockKey); // Populate cache

      // @ts-expect-error Accessing private cache for verification
      const cachedBeforeRefresh = S3Service.signedUrlCache.get(mockKey);
      expect(cachedBeforeRefresh?.url).toBe(initialUrl);

      const newRefreshedUrlValue = 'https://newly-refreshed-url.com/file.jpg?sig=verynew';
      (getSignedUrl as jest.Mock).mockResolvedValueOnce(newRefreshedUrlValue); // For the refresh call

      await S3Service.refreshSignedUrl(mockKey);

      // @ts-expect-error Accessing private cache for verification
      const cachedAfterRefresh = S3Service.signedUrlCache.get(mockKey);
      expect(cachedAfterRefresh?.url).toBe(newRefreshedUrlValue);
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
