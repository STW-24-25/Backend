import mongoose, { Schema, Document } from 'mongoose';

// Possible parcel crop types
/**
 * @swagger
 * components:
 *  schemas:
 *    CropType:
 *      type: string
 *      enum:
 *      - Cereales
 *      - Hortalizas
 *      - Frutales
 *      - Viñedos
 *      - Olivares
 *      - Legumbres
 *      - Tubérculos
 *      - Forrajes
 *      - Otros
 */
export enum CropType {
  CEREALS = 'Cereales',
  VEGETABLES = 'Hortalizas',
  FRUIT_TREES = 'Frutales',
  VINEYARDS = 'Viñedos',
  OLIVE_GROVES = 'Olivares',
  LEGUMES = 'Legumbres',
  TUBERS = 'Tubérculos',
  FORAGES = 'Forrajes',
  OTHERS = 'Otros',
}

// Parcel interface
export interface IParcel extends Document {
  location: {
    type: string;
    coordinates: number[];
  };
  products: mongoose.Schema.Types.ObjectId[];
  province: string;
  municipality: string;
  size: number;
  createdAt: Date;
  updatedAt: Date;
}

// Swagger schema doc for Parcel
/**
 * @swagger
 * components:
 *  schemas:
 *    Parcel:
 *      type: object
 *      required:
 *      - location
 *      - products
 *      - province
 *      - municipality
 *      - size
 *      properties:
 *        location:
 *          type: object
 *          properties:
 *            type:
 *              type: string
 *            coordinates:
 *              type: array
 *              items:
 *                type: number
 *        products:
 *          type: array
 *          items:
 *            type: string
 *            description: Reference to the product
 *        province:
 *         type: string
 *         description: Name of the province
 *        municipality:
 *         type: string
 *         description: Name of the municipality
 *        size:
 *         type: number
 *         description: Size of the parcel in hectares
 */

// Parcel schema for mongoose
const parcelSchema: Schema = new Schema(
  {
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: function (v: number[]) {
            return v.length === 2;
          },
          message: 'Las coordenadas deben tener exactamente dos valores: [longitud, latitud]',
        },
      },
    },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Products',
        required: true,
      },
    ],
    province: {
      type: String,
      required: true,
    },
    municipality: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Crear índice geoespacial para consultas de ubicación
parcelSchema.index({ location: '2dsphere' });

const ParcelModel = mongoose.model<IParcel>('Parcel', parcelSchema);

export default ParcelModel;