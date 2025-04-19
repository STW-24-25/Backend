import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ParcelModel, { ParcelSize, CropType } from '../models/parcel.model';
import User, { UserRole, AutonomousComunity } from '../models/user.model';
import parcelService from '../services/parcel.service';

// Mock fetch for Sigpac API calls
global.fetch = jest.fn();

// Mock the logger to avoid logs during tests
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Mock AEMET API
jest.mock('aemet-api', () => {
  return {
    Aemet: jest.fn().mockImplementation(() => {
      return {
        getWeatherByCoordinates: jest.fn().mockResolvedValue({
          weatherData: {
            fecha: '2024-04-16',
            tmax: 28.5,
            horatmax: '15:00',
            tmin: 15.2,
            horatmin: '06:00',
            tm: 22.3,
            prec: 0,
            presMax: 1015,
            presMin: 1012,
            velmedia: 10.5,
            racha: 15.2,
            dir: 220,
            inso: 8.5,
            nieve: 0,
          },
          station: {
            indicativo: 'TEST01',
            nombre: 'Estación de prueba',
          },
          distancia: 5.2,
        }),
      };
    }),
  };
});

describe('ParcelService', () => {
  let mongoServer: MongoMemoryServer;
  let userId: string;

  const mockUser = {
    username: 'farmuser',
    email: 'farm@example.com',
    passwordHash: 'hashedpassword',
    role: UserRole.MEDIUM_FARMER,
    autonomousCommunity: AutonomousComunity.ARAGON,
    isAdmin: false,
  };

  const mockCoordinates = {
    lng: -1.8054282,
    lat: 38.9598049,
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  beforeEach(async () => {
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }

    const user = new User(mockUser);
    const savedUser = (await user.save()) as mongoose.Document & { _id: mongoose.Types.ObjectId };
    userId = savedUser._id?.toString() || '';

    await ParcelModel.createIndexes();

    // Mock successful Sigpac API responses
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('recinfobypoint')) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  geometry: {
                    type: 'Polygon',
                    coordinates: [[[-1.8054282, 38.9598049]]],
                  },
                  properties: {
                    provincia: '02',
                    municipio: '179',
                  },
                },
              ],
            }),
        });
      } else if (url.includes('infodeclaracion')) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              features: [
                {
                  properties: {
                    municipio: 'VALDEGANGA',
                    parc_supcult: 140700,
                    parc_producto: 'CEBADA',
                    parc_ayu_desc: [],
                  },
                },
              ],
            }),
        });
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('createParcel', () => {
    it('should create a new parcel with correct structure', async () => {
      const parcelData = {
        user: userId,
        size: ParcelSize.MEDIUM,
        crop: CropType.CEREALS,
        location: {
          lat: mockCoordinates.lat,
          lng: mockCoordinates.lng,
        },
        autonomousCommunity: AutonomousComunity.CASTILLA_LA_MANCHA,
      };

      const result = await parcelService.createParcel(parcelData);

      expect(result).toBeDefined();
      expect(result.location).toBeDefined();
      expect(result.location.type).toBe('Point');
      expect(result.location.coordinates).toHaveLength(2);
      expect(result.products).toBeDefined();
      expect(Array.isArray(result.products)).toBe(true);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should throw an error if parcel data is invalid', async () => {
      const invalidParcelData = {
        user: userId,
      };

      await expect(parcelService.createParcel(invalidParcelData)).rejects.toThrow();
    });
  });

  describe('getParcelByCoordinates', () => {
    it('should return data with expected structure', async () => {
      // Create a user and save it
      const user = new User(mockUser);
      const savedUser = (await user.save()) as mongoose.Document & { _id: mongoose.Types.ObjectId };

      // Create a parcel and associate it with the user
      const parcel = new ParcelModel({
        user: savedUser._id,
        size: ParcelSize.MEDIUM,
        crop: CropType.CEREALS,
        location: {
          type: 'Point',
          coordinates: [mockCoordinates.lng, mockCoordinates.lat],
        },
      });
      const savedParcel = await parcel.save();

      // Update user with the parcel reference
      await User.findByIdAndUpdate(savedUser._id, {
        $push: { parcels: savedParcel._id },
      });

      const result = await parcelService.getParcelByCoordinates(
        savedUser._id.toString(),
        mockCoordinates.lng,
        mockCoordinates.lat,
      );

      expect(result).toEqual({
        parcel: {
          geoJSON: expect.objectContaining({
            type: 'FeatureCollection',
            features: expect.any(Array),
          }),
          createdAt: expect.any(Date),
          municipio: expect.any(String),
          provincia: expect.any(String),
          superficie: expect.any(Number),
          products: expect.any(Array),
        },
        weather: {
          date: expect.any(String),
          description: expect.any(String),
          icon: expect.any(String),
          main: {
            temp: expect.any(Number),
            temp_max: expect.any(Number),
            temp_min: expect.any(Number),
            humidity: expect.any(Number),
            pressure_max: expect.any(Number),
            pressure_min: expect.any(Number),
          },
          precipitation: {
            rain: expect.any(Number),
            snow: expect.any(Number),
          },
          solar: {
            radiation: expect.any(Number),
          },
          time_max_temp: expect.any(String),
          time_min_temp: expect.any(String),
          wind: {
            speed: expect.any(Number),
            gust: expect.any(Number),
            direction: expect.any(Number),
          },
        },
      });
    });

    it('should return data with default weather structure when API fails', async () => {
      // Create a user and save it
      const user = new User(mockUser);
      const savedUser = (await user.save()) as mongoose.Document & { _id: mongoose.Types.ObjectId };

      // Create a parcel and associate it with the user
      const parcel = new ParcelModel({
        user: savedUser._id,
        size: ParcelSize.MEDIUM,
        crop: CropType.CEREALS,
        location: {
          type: 'Point',
          coordinates: [mockCoordinates.lng, mockCoordinates.lat],
        },
      });
      const savedParcel = await parcel.save();

      // Update user with the parcel reference
      await User.findByIdAndUpdate(savedUser._id, {
        $push: { parcels: savedParcel._id },
      });

      // Mock AEMET API failure
      jest.requireMock('aemet-api').Aemet.mockImplementation(() => ({
        getWeatherByCoordinates: jest.fn().mockRejectedValue(new Error('AEMET API error')),
      }));

      const result = await parcelService.getParcelByCoordinates(
        savedUser._id.toString(),
        mockCoordinates.lng,
        mockCoordinates.lat,
      );

      // Verificar solo la estructura con valores por defecto
      expect(result.weather).toEqual({
        date: expect.any(String),
        description: expect.any(String),
        icon: expect.any(String),
        main: {
          temp: expect.any(Number),
          temp_max: expect.any(Number),
          temp_min: expect.any(Number),
          humidity: expect.any(Number),
          pressure_max: expect.any(Number),
          pressure_min: expect.any(Number),
        },
        precipitation: {
          rain: expect.any(Number),
          snow: expect.any(Number),
        },
        solar: {
          radiation: expect.any(Number),
        },
        time_max_temp: expect.any(String),
        time_min_temp: expect.any(String),
        wind: {
          speed: expect.any(Number),
          gust: expect.any(Number),
          direction: expect.any(Number),
        },
      });
    });

    it('should throw error when parcel is not found', async () => {
      await expect(parcelService.getParcelByCoordinates(userId, -2.1234, 39.5678)).rejects.toThrow(
        'No se encontró la parcela en las coordenadas especificadas',
      );
    });
  });
});
