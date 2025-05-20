import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, S3_CONFIG } from '../config/s3.config';
import logger from '../utils/logger';
import multer from 'multer';
import sharp from 'sharp';

/**
 * Interfaz para los elementos en caché
 */
interface SignedUrlCacheItem {
  url: string;
  expiresAt: number; // Timestamp en milisegundos
}

/**
 * Service for handling S3 operations
 */
export default class S3Service {
  /**
   * Caché de URLs firmadas
   * Clave: ruta en el bucket de S3
   * Valor: objeto con la URL firmada y su tiempo de expiración
   */
  private static signedUrlCache: Map<string, SignedUrlCacheItem> = new Map();

  /**
   * Tiempo de expiración predeterminado para las URLs firmadas (en segundos)
   */
  private static defaultExpirationTime: number = 3600; // 1 hora

  /**
   * Multer configuration for file uploads
   * Stores files in memory for processing before S3 upload
   */
  static multerUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: S3_CONFIG.MAX_FILE_SIZE,
    },
    fileFilter: (req, file, cb) => {
      // Check if mimetype is allowed
      if (S3_CONFIG.ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
        cb(null, true);
      } else {
        cb(
          new Error(`Invalid file type. Allowed types: ${S3_CONFIG.ALLOWED_MIME_TYPES.join(', ')}`),
        );
      }
    },
  });

  /**
   * Processes an image using sharp
   * @param buffer - The image buffer to process
   * @param width - Width to resize to (default from S3_CONFIG)
   * @param height - Height to resize to (default from S3_CONFIG)
   * @returns Processed image buffer
   */
  static async processImage(
    buffer: Buffer,
    width: number = S3_CONFIG.IMAGE_DIMENSIONS.WIDTH,
    height: number = S3_CONFIG.IMAGE_DIMENSIONS.HEIGHT,
  ): Promise<Buffer> {
    return await sharp(buffer)
      .rotate()
      .resize(width, height, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 80 })
      .toBuffer();
  }

  /**
   * Uploads a file to S3
   * @param file - The file buffer to upload
   * @param key - The S3 key (path) for the file
   * @param contentType - The MIME type of the file
   * @returns The S3 key of the uploaded file
   */
  static async uploadFile(file: Buffer, key: string, contentType: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: S3_CONFIG.BUCKET_NAME,
        Key: key,
        Body: file,
        ContentType: contentType,
      });

      await s3Client.send(command);
      return key;
    } catch (error) {
      logger.error('Error uploading file to S3:', error);
      throw new Error('Failed to upload file to S3');
    }
  }

  /**
   * Gets a signed URL for a file in S3
   * @param key - The S3 key (path) for the file
   * @param forceRefresh - Si es true, fuerza la regeneración de la URL firmada aunque exista en caché
   * @returns A signed URL that can be used to access the file
   */
  static async getSignedUrl(key: string, forceRefresh: boolean = false): Promise<string> {
    try {
      // Verificar si la URL ya está en caché y no ha expirado
      const now = Date.now();
      const cachedItem = this.signedUrlCache.get(key);

      // Si hay una URL en caché, no se forzó la actualización y no ha expirado, devolverla
      if (cachedItem && !forceRefresh && cachedItem.expiresAt > now) {
        logger.debug(`Usando URL firmada en caché para: ${key}`);
        return cachedItem.url;
      }

      // Si no hay URL en caché o ha expirado, generar una nueva
      const command = new GetObjectCommand({
        Bucket: S3_CONFIG.BUCKET_NAME,
        Key: key,
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn: this.defaultExpirationTime });

      // Calcular el tiempo de expiración (ahora + tiempo de expiración - 5 minutos de margen)
      const expiresAt = now + this.defaultExpirationTime * 1000 - 5 * 60 * 1000;

      // Guardar en caché
      this.signedUrlCache.set(key, { url, expiresAt });
      logger.debug(`Nueva URL firmada generada y almacenada en caché para: ${key}`);

      return url;
    } catch (error) {
      logger.error('Error generating signed URL:', error);
      throw new Error('Failed to generate signed URL');
    }
  }

  /**
   * Deletes a file from S3
   * @param key - The S3 key (path) for the file
   */
  static async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: S3_CONFIG.BUCKET_NAME,
        Key: key,
      });

      await s3Client.send(command);

      // Eliminar la URL de la caché si existe
      if (this.signedUrlCache.has(key)) {
        this.signedUrlCache.delete(key);
        logger.debug(`URL firmada eliminada de la caché para: ${key}`);
      }
    } catch (error) {
      logger.error('Error deleting file from S3:', error);
      throw new Error('Failed to delete file from S3');
    }
  }

  /**
   * Limpia las URLs firmadas expiradas de la caché
   */
  static cleanExpiredCache(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, item] of this.signedUrlCache.entries()) {
      if (item.expiresAt <= now) {
        this.signedUrlCache.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      logger.debug(`Se eliminaron ${expiredCount} URLs firmadas expiradas de la caché`);
    }
  }

  /**
   * Obtiene el tamaño actual de la caché de URLs firmadas
   * @returns Número de elementos en la caché
   */
  static getCacheSize(): number {
    return this.signedUrlCache.size;
  }

  /**
   * Genera una nueva URL firmada y la actualiza en la caché
   * @param key - The S3 key (path) for the file
   * @returns La nueva URL firmada
   */
  static async refreshSignedUrl(key: string): Promise<string> {
    return await this.getSignedUrl(key, true);
  }

  /**
   * Obtiene la URL firmada para la imagen de perfil por defecto
   * @returns URL firmada para la imagen de perfil por defecto
   */
  static async getDefaultProfilePictureUrl(): Promise<string> {
    try {
      // Revisar si ya tenemos la URL en caché
      return await this.getSignedUrl(S3_CONFIG.DEFAULT_IMAGES.USER_PROFILE);
    } catch (error) {
      logger.error('Error getting default profile picture URL:', error);
      throw new Error('Failed to get default profile picture URL');
    }
  }

  /**
   * Generates a unique key for a user profile picture
   * @param userId - The ID of the user
   * @param fileExtension - The file extension of the image
   * @returns A unique S3 key for the user's profile picture
   */
  static generateUserProfileKey(userId: string, fileExtension: string): string {
    return `${S3_CONFIG.PATHS.USER_PROFILE}/${userId}-${Date.now()}.${fileExtension}`;
  }

  /**
   * Generates a unique key for a product image
   * @param productId - The ID of the product
   * @param fileExtension - The file extension of the image
   * @returns A unique S3 key for the product image
   */
  static generateProductImageKey(productId: string, fileExtension: string): string {
    return `${S3_CONFIG.PATHS.PRODUCT_IMAGES}/${productId}-${Date.now()}.${fileExtension}`;
  }
}
