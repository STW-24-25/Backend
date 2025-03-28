import mongoose, { Schema, Document } from 'mongoose';
import { AutonomousComunity } from './user.model';

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

// Possible parcel size categories
/**
 * @swagger
 * components:
 *  schemas:
 *    ParcelSize:
 *      type: string
 *      enum:
 *      - Pequeña
 *      - Mediana
 *      - Grande
 */
export enum ParcelSize {
  SMALL = 'Pequeña',
  MEDIUM = 'Mediana',
  LARGE = 'Grande',
}

// Parcel interface
interface IParcel extends Document {
  user: mongoose.Schema.Types.ObjectId;
  size: ParcelSize;
  crop: CropType;
  location: {
    type: string;
    coordinates: number[];
  };
  autonomousCommunity: AutonomousComunity;
  geoJSON: any;
  sigpacData: {
    provincia: string;
    municipio: string;
    poligono: string;
    parcela: string;
    area: number;
    perimetro: number;
    declarationInfo: any;
  };
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
 *      - user
 *      - size
 *      - crop
 *      - location
 *      - autonomousCommunity
 *      - geoJSON
 *      - createdAt
 *      properties:
 *        user:
 *          type: string
 *          description: Reference to the user who owns the parcel
 *        size:
 *          $ref: '#/components/schemas/ParcelSize'
 *        crop:
 *          $ref: '#/components/schemas/CropType'
 *        location:
 *          type: object
 *          properties:
 *            type:
 *              type: string
 *            coordinates:
 *              type: array
 *        autonomousCommunity:
 *          $ref: '#/components/schemas/AutonomousCommunity'
 *        geoJSON:
 *          type: object
 *          description: GeoJSON representation of the parcel
 *        createdAt:
 *          type: string
 *          format: date
 */

// Parcel schema for mongoose
const parcelSchema: Schema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    size: {
      type: String,
      enum: ParcelSize,
      required: true,
    },
    crop: {
      type: String,
      enum: CropType,
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    autonomousCommunity: {
      type: String,
      enum: AutonomousComunity,
      required: true,
    },
    geoJSON: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    sigpacData: {
      provincia: String,
      municipio: String,
      poligono: String,
      parcela: String,
      area: Number,
      perimetro: Number,
      declarationInfo: mongoose.Schema.Types.Mixed,
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
