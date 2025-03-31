import { Router } from 'express';
import * as productController from '../controllers/product.controller';
import * as productRequestSchemas from '../middleware/validator/product.schemas';
import { validateSchema } from '../middleware/validator';
import { authenticateJWT } from '../middleware/auth';

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
 *                      _id:
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

export default router;
