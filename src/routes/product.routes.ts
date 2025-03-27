import { Router } from 'express';
import * as productController from '../controllers/product.controller';

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
router.get('/', productController.getAllProducts);

// todo swagger
router.get('/:productId', productController.getProduct);

export default router;
