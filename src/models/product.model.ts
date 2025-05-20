import mongoose, { Schema, Document } from 'mongoose';

/**
 * @swagger
 * components:
 *  schemas:
 *    ProductSector:
 *      type: string
 *      enum:
 *      - CEREALES
 *      - ARROZ
 *      - ACEITES VEGETALES Y ACEITUNA DE MESA
 *      - VINO
 *      - SEMILLAS OLEAGINOSAS, PROTEICOS Y TORTAS
 *      - FRUTAS
 *      - HORTALIZAS
 *      - BOVINO
 *      - OVINO
 *      - PORCINO
 *      - AVES, HUEVOS, CAZA
 *      - LÁCTEOS
 */
export enum ProductSector {
  CEREALS = 'CEREALES',
  RICE = 'ARROZ',
  OIL_OLIVES = 'ACEITES VEGETALES Y ACEITUNA DE MESA',
  WINE = 'VINO',
  OILSEEDS_PROTEINS_RESIDUALS = 'SEMILLAS OLEAGINOSAS, PROTEICOS Y TORTAS',
  FRUITS = 'FRUTAS',
  VEGETABLES = 'HORTALIZAS',
  BOVINE = 'BOVINO',
  OVINE = 'OVINO',
  PORCINE = 'PORCINO',
  BIRDS_EGGS_HUNT = 'AVES, HUEVOS, CAZA',
  DAIRY = 'LÁCTEOS',
}

// Product interface
export interface IProduct extends Document {
  name: string;
  sector: ProductSector;
  prices: {
    date: Date;
    price: number;
  }[];
  image: string;
}

/**
 * @swagger
 * components:
 *  schemas:
 *    Product:
 *      type: object
 *      required:
 *      - name
 *      - sector
 *      - prices
 *      properties:
 *        name:
 *          type: string
 *        sector:
 *          $ref: '#/components/schemas/ProductSector'
 *        prices:
 *          type: array
 *          items:
 *            type: object
 *            properties:
 *              date:
 *                type: string
 *                format: date
 *              price:
 *                type: number
 *                format: float
 *        image:
 *          type: string
 */
const productSchema: Schema = new Schema({
  name: { type: String, required: true },
  sector: { type: String, enum: ProductSector, required: true },
  prices: [
    {
      date: { type: Date, required: true },
      price: { type: Number, required: true },
    },
  ],
  image: { type: String, required: false },
});

const ProductModel = mongoose.model<IProduct>('Products', productSchema);

export default ProductModel;
