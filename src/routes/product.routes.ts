import { Router } from 'express';
import * as productController from '../controllers/product.controller';
import * as productRequestSchemas from '../middleware/validator/product.schemas';
import { validateSchema } from '../middleware/validator';
import { authenticateJWT } from '../middleware/auth';
import { isAdmin } from '../middleware/admin';
import { validateImage } from '../middleware/image.middleware';
import S3Service from '../services/s3.service';

const router = Router();

// #### PUBLIC ####

/**
 * @swagger
 * /api/products:
 *  get:
 *    summary: Return products basic information (paginated). Get a list of products with optional filtering and pagination, including the last known price
 *    tags: [Product]
 *    parameters:
 *      - $ref: '#/components/parameters/getAllProductsNameParameterSchema'
 *      - $ref: '#/components/parameters/getAllProductsPageParameterSchema'
 *      - $ref: '#/components/parameters/getAllProductsSizeParameterSchema'
 *    responses:
 *      200:
 *        description: A paginated list of products with the last known price
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                products:
 *                  type: array
 *                  items:
 *                    type: object
 *                    properties:
 *                      id:
 *                        type: string
 *                      name:
 *                        type: string
 *                      sector:
 *                        $ref: '#/components/schemas/ProductSector'
 *                      lastPrice:
 *                        type: number
 *                        format: float
 *                      image:
 *                        type: string
 *                page:
 *                  type: integer
 *                pageSize:
 *                  type: integer
 *                totalProducts:
 *                  type: integer
 *                totalPages:
 *                  type: integer
 *      500:
 *        description: Error processing request
 */
router.get(
  '/',
  authenticateJWT(),
  validateSchema(productRequestSchemas.getAllProductsSchema),
  productController.getAllProducts,
);

/**
 * @swagger
 * /api/products/{id}:
 *  get:
 *    summary: Return the detailed information of a product given its ID.
 *    tags: [Product]
 *    parameters:
 *      - $ref: '#/components/parameters/getProductByIdIdParameterSchema'
 *    responses:
 *      200:
 *        description: The product's information.
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                id:
 *                  type: string
 *                name:
 *                  type: string
 *                sector:
 *                  $ref: '#/components/schemas/ProductSector'
 *                image:
 *                  type: string
 *                prices:
 *                  type: array
 *                  items:
 *                    type: object
 *                    properties:
 *                      date:
 *                        type: string
 *                        format: date-time
 *                      price:
 *                        type: number
 *                        format: float
 *                priceChange:
 *                  type: object
 *                  properties:
 *                    one_month:
 *                      type: number
 *                      format: float
 *                    six_months:
 *                      type: number
 *                      format: float
 *                    one_year:
 *                      type: number
 *                      format: float
 *                    all:
 *                      type: number
 *                      format: float
 *                    ytd:
 *                      type: number
 *                      format: float
 *      404:
 *        description: Product not found
 *      500:
 *        description: Error processing request
 */
router.get(
  '/:id',
  authenticateJWT(),
  validateSchema(productRequestSchemas.getProductByIdSchema),
  productController.getProductById,
);

/**
 * @swagger
 * /api/products/{id}/image:
 *  post:
 *    summary: Upload a product image (Admin only)
 *    security:
 *      - bearerAuth: []
 *    tags: [Admin]
 *    parameters:
 *      - $ref: '#/components/parameters/getProductByIdIdParameterSchema'
 *    requestBody:
 *      required: true
 *      content:
 *        multipart/form-data:
 *          schema:
 *            type: object
 *            properties:
 *              image:
 *                type: string
 *                format: binary
 *    responses:
 *      200:
 *        description: Product image uploaded successfully
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                message:
 *                  type: string
 *                imageUrl:
 *                  type: string
 *      400:
 *        description: No file uploaded or invalid file type
 *      404:
 *        description: Product not found
 *      500:
 *        description: Error uploading image
 */
router.post(
  '/:id/image',
  authenticateJWT(),
  isAdmin(),
  S3Service.multerUpload.single('image'),
  validateImage,
  productController.uploadProductImage,
);

/**
 * @swagger
 * /api/products/{id}/image:
 *  delete:
 *    summary: Delete a product image (Admin only)
 *    security:
 *      - bearerAuth: []
 *    tags: [Admin]
 *    parameters:
 *      - $ref: '#/components/parameters/getProductByIdIdParameterSchema'
 *    responses:
 *      200:
 *        description: Product image deleted successfully
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                message:
 *                  type: string
 *      400:
 *        description: No image to delete
 *      404:
 *        description: Product not found
 *      500:
 *        description: Error deleting image
 */
router.delete('/:id/image', authenticateJWT(), isAdmin(), productController.deleteProductImage);

/**
 * @swagger
 * /api/products/refresh-images:
 *  post:
 *    summary: Refreshes signed URLs for product images
 *    security:
 *      - bearerAuth: []
 *    tags: [Product]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              productIds:
 *                type: array
 *                items:
 *                  type: string
 *                description: Array of product IDs to refresh images for
 *    responses:
 *      200:
 *        description: Product images refreshed successfully
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                images:
 *                  type: object
 *                  additionalProperties:
 *                    type: string
 *                  description: Object containing product IDs mapped to their signed image URLs
 *      500:
 *        description: Error refreshing product images
 */
router.post('/refresh-images', authenticateJWT(), productController.refreshProductImages);

export default router;
