import { isValidObjectId } from 'mongoose';
import { z } from 'zod';

/**
 * @swagger
 * components:
 *  parameters:
 *    getAllProductsNameParameterSchema:
 *      in: query
 *      name: name
 *      schema:
 *        type: string
 *      required: false
 *      description: Name of the product to retrieve, empty for all products
 *    getAllProductsPageParameterSchema:
 *      in: query
 *      name: page
 *      schema:
 *        type: integer
 *        minimum: 1
 *        default: 1
 *      required: false
 *      description: Page to be retrieved
 *    getAllProductsSizeParameterSchema:
 *      in: query
 *      name: size
 *      schema:
 *        type: integer
 *        minimum: 1
 *        default: 16
 *      required: false
 *      description: Number of products per page
 */
export const getAllProductsSchema = z.object({
  query: z.object({
    name: z.string().optional(),
    page: z.string().optional(),
    size: z.string().optional(),
  }),
});

/**
 * @swagger
 * components:
 *  parameters:
 *    getProductByIdIdParameterSchema:
 *      in: path
 *      name: id
 *      schema:
 *        type: string
 *      required: true
 *      description: The id of the product to retrieve
 */
export const getProductByIdSchema = z.object({
  params: z.object({
    id: z.string().refine(val => isValidObjectId(val)),
  }),
});
