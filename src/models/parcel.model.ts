import mongoose, { Schema, Document } from 'mongoose';
import { Feature, FeatureCollection, Point, Polygon } from 'geojson';

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

interface ParcelFeatureProperties {
  name: 'polygon' | 'pointOnFeature';
}

interface ParcelGeometry extends FeatureCollection {
  features: [Feature<Polygon, ParcelFeatureProperties>, Feature<Point, ParcelFeatureProperties>];
}

// Parcel interface
export interface IParcel extends Document {
  geometry: ParcelGeometry;
  products: mongoose.Schema.Types.ObjectId[];
  crop: CropType;
  provinceCode: number;
  provinceName: string;
  municipalityCode: number;
  municipalityName: string;
  surface: number;
  parcelUse: string;
  coefRegadio: number;
  altitude: number;
  createdAt: Date;
  updatedAt: Date;
}

// todo add example so that docs don't break bc swagger is my best friend

/**
 * @swagger
 * components:
 *  schemas:
 *    GeoJSONPoint:
 *      type: object
 *      description: GeoJSON Point object
 *      required:
 *        - type
 *        - coordinates
 *      properties:
 *        type:
 *          type: string
 *          enum: [Point]
 *          description: GeoJSON type for points
 *        coordinates:
 *          type: array
 *          description: "Longitude and latitude coordinates"
 *          minItems: 2
 *          maxItems: 2
 *          items:
 *            type: number
 *
 *    GeoJSONPolygon:
 *      type: object
 *      description: GeoJSON Polygon object
 *      required:
 *        - type
 *        - coordinates
 *      properties:
 *        type:
 *          type: string
 *          enum: [Polygon]
 *          description: GeoJSON type for polygons
 *        coordinates:
 *          type: array
 *          description: "Array of polygon rings (first is outer ring, rest are holes)"
 *          items:
 *            type: array
 *            items:
 *              type: array
 *              minItems: 4
 *              items:
 *                type: number
 *
 *    GeoJSONFeature:
 *      type: object
 *      required:
 *        - type
 *        - geometry
 *        - properties
 *      properties:
 *        type:
 *          type: string
 *          enum: [Feature]
 *          description: GeoJSON Feature type
 *        geometry:
 *          oneOf:
 *            - $ref: '#/components/schemas/GeoJSONPoint'
 *            - $ref: '#/components/schemas/GeoJSONPolygon'
 *        properties:
 *          type: object
 *          required:
 *            - name
 *          properties:
 *            name:
 *              type: string
 *              enum: [polygon, pointOnFeature]
 *              description: Identifies the feature's purpose
 *
 *    GeoJSONFeatureCollection:
 *      type: object
 *      required:
 *        - type
 *        - features
 *      properties:
 *        type:
 *          type: string
 *          enum: [FeatureCollection]
 *          description: GeoJSON FeatureCollection type
 *        features:
 *          type: array
 *          items:
 *            $ref: '#/components/schemas/GeoJSONFeature'
 *          minItems: 2
 *          maxItems: 2
 *
 *    Parcel:
 *      type: object
 *      required:
 *        - geometry
 *        - products
 *        - provinceCode
 *        - provinceName
 *        - municipalityCode
 *        - municipalityName
 *        - size
 *      properties:
 *        geometry:
 *          $ref: '#/components/schemas/GeoJSONFeatureCollection'
 *        products:
 *          type: array
 *          description: List of product IDs associated with this parcel
 *          items:
 *            type: string
 *            format: MongoId
 *            description: Reference to the products
 *        crop:
 *          $ref: '#/components/schemas/CropType'
 *        provinceCode:
 *          type: number
 *          description: Province code
 *        provinceName:
 *          type: string
 *          description: Name of the province
 *        municipalityCode:
 *          type: number
 *          description: Municipality code
 *        municipalityName:
 *          type: string
 *          description: Name of the municipality
 *        parcelUse:
 *          type: string
 *          description: Use of the parcel according to SIGPAC
 *        coefRegadio:
 *          type: number
 *          description: Irrigation coefficient in percentage
 *        altitude:
 *          type: number
 *          description: Altitude in meters
 *        surface:
 *          type: number
 *          description: Size of the parcel in hectares
 *        createdAt:
 *          type: string
 *          format: date-time
 *          description: Date when the parcel was created
 *        updatedAt:
 *          type: string
 *          format: date-time
 *          description: Date when the parcel was last updated
 */
const parcelSchema: Schema = new Schema(
  {
    geometry: {
      type: {
        type: String,
        enum: ['FeatureCollection'],
        required: true,
      },
      features: {
        type: [
          {
            type: {
              type: String,
              enum: ['Feature'],
              required: true,
            },
            geometry: {
              type: {
                type: String,
                enum: ['Polygon', 'Point'],
                required: true,
              },
              coordinates: {
                type: Schema.Types.Mixed,
                required: true,
              },
            },
            properties: {
              type: Object,
              required: true,
              name: {
                type: String,
                enum: ['polygon', 'pointOnFeature'],
                required: true,
              },
            },
          },
        ],
        required: true,
        validate: {
          validator: function (features: any[]) {
            if (features.length !== 2) return false;
            const hasPolygon = features.some(
              f => f.properties.name === 'polygon' && f.geometry.type === 'Polygon',
            );
            const hasPointOnFeature = features.some(
              f => f.properties.name === 'pointOnFeature' && f.geometry.type === 'Point',
            );
            return hasPolygon && hasPointOnFeature;
          },
          message: 'Geometry must contain exactly one polygon and its pointOnFeature feature',
        },
      },
    },
    products: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
        },
      ],
      default: [],
    },
    crop: {
      type: String,
      enum: Object.values(CropType),
      required: true,
    },
    provinceCode: {
      type: Number,
      required: true,
    },
    provinceName: {
      type: String,
      required: true,
    },
    municipalityCode: {
      type: Number,
      required: true,
    },
    municipalityName: {
      type: String,
      required: true,
    },
    surface: {
      type: Number,
      required: true,
    },
    parcelUse: {
      type: String,
      required: true,
    },
    coefRegadio: {
      type: Number,
      required: true,
      default: 0,
    },
    altitude: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Crear índice geoespacial para consultas de ubicación
parcelSchema.index({ 'geometry.features.geometry': '2dsphere' });

const ParcelModel = mongoose.model<IParcel>('Parcel', parcelSchema);

export default ParcelModel;
