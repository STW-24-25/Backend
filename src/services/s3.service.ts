import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, S3_CONFIG } from '../config/s3.config';
import logger from '../utils/logger';

/**
 * Service for handling S3 operations
 */
export class S3Service {
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
   * @returns A signed URL that can be used to access the file
   */
  static async getSignedUrl(key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: S3_CONFIG.BUCKET_NAME,
        Key: key,
      });

      return await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL expires in 1 hour
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
    } catch (error) {
      logger.error('Error deleting file from S3:', error);
      throw new Error('Failed to delete file from S3');
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
