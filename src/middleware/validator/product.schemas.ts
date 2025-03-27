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
 *      required: true
 *      description: Page to be retrieved
 *    getAllProductsSizeParameterSchema:
 *      in: query
 *      name: size
 *      schema:
 *        type: integer
 *        minimum: 1
 *        default: 16
 *      required: true
 *      description: Number of products per page
 */
export const getAllProductsSchema = z.object({
  query: z.object({
    name: z.string().optional(),
    page: z
      .string()
      .optional()
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Page must be a positive number',
      }),
    size: z
      .string()
      .optional()
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Size must be a positive number',
      }),
  }),
});
