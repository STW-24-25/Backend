process.env.AEMET_API_KEY = 'my-aemet-api-key';
import mongoose, { ObjectId, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import parcelService from '../services/parcel.service';
import ParcelModel, { CropType, IParcel } from '../models/parcel.model';
import ProductModel, { IProduct, ProductSector } from '../models/product.model';
import UserModel, { IUser, UserRole, AutonomousComunity } from '../models/user.model';
import userService from '../services/user.service';
import axios from 'axios';
import {
  getGeoJSONSigpacUrl,
  getMunicSigpacUrl,
  USO_SIGPAC_URL,
} from '../services/constants/sigpac.constants';
import pointOnFeature from '@turf/point-on-feature';

// --- Mocking External Dependencies ---

jest.mock('aemet-api', () => {
  const mockGetWeather = jest.fn();
  return {
    Aemet: jest.fn(() => ({
      getWeatherByCoordinates: mockGetWeather,
    })),
  };
});

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('axios');
jest.mock('../services/user.service');

jest.mock('@turf/point-on-feature');

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

beforeEach(async () => {
  await clearDatabase();
  jest.clearAllMocks();

  (pointOnFeature as jest.Mock).mockReturnValue({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-1.5, 40.5] },
    properties: {},
  });
});

// --- Helper Functions ---
async function createTestUser(userData: Partial<IUser> = {}): Promise<IUser> {
  const defaultUser = {
    username: `testuser-${new Types.ObjectId().toHexString()}`,
    email: `test-${new Types.ObjectId().toHexString()}@example.com`,
    passwordHash: 'hashedpassword',
    role: UserRole.SMALL_FARMER,
    autonomousCommunity: AutonomousComunity.ARAGON,
    isAdmin: false,
  };
  return UserModel.create({ ...defaultUser, ...userData });
}

async function createTestProduct(productData: Partial<IProduct> = {}): Promise<IProduct> {
  const defaultProduct = {
    name: `Test Product ${new Types.ObjectId().toHexString()}`,
    sector: ProductSector.CEREALS,
    category: 'Trigo',
    description: 'Test description',
    priceHistory: [{ date: new Date(), price: 100 }],
  };
  return ProductModel.create({ ...defaultProduct, ...productData });
}
// --- End Helper Functions ---

describe('ParcelService', () => {
  const testUserId = new Types.ObjectId().toString();
  const mockLng = -0.123;
  const mockLat = 40.456;

  // --- Mock Data for External APIs ---
  const mockSigpacGeoJSONFeatureProperties = {
    provincia: 28,
    municipio: 79,
    uso_sigpac: 'TA',
    coef_regadio: 50,
    altitud: 600,
    dn_surface: 100000,
  };
  const mockSigpacGeoJSONPolygon = {
    type: 'Polygon' as const,
    coordinates: [
      [
        [-1, 40],
        [-1, 41],
        [-2, 41],
        [-2, 40],
        [-1, 40],
      ],
    ],
  };

  const mockSigpacGeoJSONPoint = {
    type: 'Point' as const,
    coordinates: [mockLng, mockLat],
  };

  const mockSigpacGeoJSONResponse = {
    data: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: mockSigpacGeoJSONPolygon,
          properties: mockSigpacGeoJSONFeatureProperties,
        },
      ],
    },
  };

  const mockSigpacUsoResponse = {
    status: 200,
    data: {
      codigos: [{ codigo: 'TA', descripcion: 'Tierras Arables' }],
    },
  };

  const mockSigpacMunicResponseMadrid = {
    status: 200,
    data: {
      codigos: [{ codigo: 79, descripcion: 'MADRID' }],
    },
  };

  const mockAemetWeatherResponseData = {
    weatherData: {
      temperatura: 25,
      sensTermica: 24,
      humedadRelativa: 60,
      estadoCielo: { descripcion: 'Despejado' },
      viento: { velocidad: 10, rachaMax: 15, direccion: 'N' },
      precipitacion: 0,
      probPrecipitacion: 0,
      nieve: 0,
      probNieve: 0,
      probTormenta: 0,
      fecha: '2023-01-01',
      periodo: '12',
    },
    distancia: 5,
    name: 'Madrid',
  };
  // --- End Mock Data ---

  // Default axios mock implementation
  const mockAxiosGetImplementation = (url: string) => {
    if (url === getGeoJSONSigpacUrl(mockLng, mockLat)) {
      return Promise.resolve(mockSigpacGeoJSONResponse);
    }
    if (url === USO_SIGPAC_URL) {
      return Promise.resolve(mockSigpacUsoResponse);
    }
    if (url === getMunicSigpacUrl(mockSigpacGeoJSONFeatureProperties.provincia)) {
      return Promise.resolve(mockSigpacMunicResponseMadrid);
    }
    return Promise.reject(new Error(`Unhandled axios GET request to ${url}`));
  };

  describe('createParcel', () => {
    const parcelInputData = {
      location: { lng: mockLng, lat: mockLat },
      crop: CropType.CEREALS,
      products: [] as string[],
    };

    beforeEach(() => {
      (axios.get as jest.Mock).mockImplementation(mockAxiosGetImplementation);
    });

    it('should create a parcel successfully without products', async () => {
      const user = await createTestUser({ _id: testUserId });
      const createdParcel = await parcelService.createParcel(user._id as string, {
        ...parcelInputData,
        products: [],
      });

      expect(createdParcel).toBeDefined();
      expect(createdParcel.crop).toBe(CropType.CEREALS);
      expect(createdParcel.provinceName).toBe('Madrid');
      expect(createdParcel.municipalityName).toBe('Madrid');
      expect(createdParcel.parcelUse).toBe('Tierras Arables');
      expect(createdParcel.surface).toBe(10);
      expect(createdParcel.products).toHaveLength(0);

      const updatedUser = await UserModel.findById(user._id);
      expect(updatedUser?.parcels).toContainEqual(createdParcel._id);
    });

    it('should create a parcel successfully with valid products', async () => {
      const user = await createTestUser({ _id: testUserId });
      const product1 = await createTestProduct();
      const product2 = await createTestProduct();
      const inputDataWithProducts = {
        ...parcelInputData,
        products: [product1._id as string, product2._id as string],
      };

      const createdParcel = await parcelService.createParcel(
        user._id as string,
        inputDataWithProducts,
      );

      expect(createdParcel).toBeDefined();
      expect(createdParcel.products).toHaveLength(2);
      expect(createdParcel.products).toContainEqual(product1._id);
      expect(createdParcel.products).toContainEqual(product2._id);
    });

    it('should throw an error if SIGPAC returns no features', async () => {
      (axios.get as jest.Mock).mockImplementation(url => {
        if (url === getGeoJSONSigpacUrl(mockLng, mockLat)) {
          return Promise.resolve({ data: { features: [] } });
        }
        return mockAxiosGetImplementation(url);
      });
      await expect(parcelService.createParcel(testUserId, parcelInputData)).rejects.toThrow(
        'Failed to create parcel: Failed to fetch GeoJSON from Sigpac: No parcel found at specified coordinates',
      );
    });

    it('should throw an error if parcel use is invalid', async () => {
      const invalidUseSigpacResponse = {
        data: {
          ...mockSigpacGeoJSONResponse.data,
          features: [
            {
              ...mockSigpacGeoJSONResponse.data.features[0],
              properties: { ...mockSigpacGeoJSONFeatureProperties, uso_sigpac: 'XX' },
            },
          ],
        },
      };
      (axios.get as jest.Mock).mockImplementation(url => {
        if (url === getGeoJSONSigpacUrl(mockLng, mockLat))
          return Promise.resolve(invalidUseSigpacResponse);
        if (url === USO_SIGPAC_URL)
          return Promise.resolve({
            data: { codigos: [{ codigo: 'XX', descripcion: 'Invalid Use' }] },
          });
        return mockAxiosGetImplementation(url);
      });

      await expect(parcelService.createParcel(testUserId, parcelInputData)).rejects.toThrow(
        'Failed to create parcel: Failed to fetch GeoJSON from Sigpac: The parcel selected is not of valid use: XX',
      );
    });

    it('should throw an error if one or more product IDs are invalid', async () => {
      const user = await createTestUser({ _id: testUserId });
      const validProduct = await createTestProduct();
      const invalidProductId = new Types.ObjectId().toString();
      const inputDataWithInvalidProduct = {
        ...parcelInputData,
        products: [validProduct._id as string, invalidProductId],
      };

      await expect(
        parcelService.createParcel(user._id as string, inputDataWithInvalidProduct),
      ).rejects.toThrow('Failed to create parcel: One or more product IDs are invalid');
    });
  });

  describe('createParcel (testing private method behaviors)', () => {
    const parcelInputData = {
      location: { lng: mockLng, lat: mockLat },
      crop: CropType.CEREALS,
      products: [] as string[],
    };

    beforeEach(() => {
      // Reset axios mock for each test in this sub-describe if needed,
      // or rely on the outer mockAxiosGetImplementation and override parts of it.
      (axios.get as jest.Mock).mockImplementation(mockAxiosGetImplementation);
    });

    it('should use default 0 for coefRegadio if SIGPAC data is missing it', async () => {
      const user = await createTestUser({ _id: testUserId });
      const sigpacPropsWithoutCoef = { ...mockSigpacGeoJSONFeatureProperties };
      // @ts-expect-error // Testing missing property
      delete sigpacPropsWithoutCoef.coef_regadio;

      (axios.get as jest.Mock).mockImplementation(url => {
        if (url === getGeoJSONSigpacUrl(mockLng, mockLat)) {
          return Promise.resolve({
            data: {
              features: [
                {
                  type: 'Feature',
                  properties: sigpacPropsWithoutCoef,
                  geometry: mockSigpacGeoJSONPolygon,
                },
              ],
            },
          });
        }
        return mockAxiosGetImplementation(url);
      });

      const createdParcel = await parcelService.createParcel(
        user._id as unknown as string,
        parcelInputData,
      );
      expect(createdParcel.coefRegadio).toBe(0);
    });

    it('should use default 0 for altitude if SIGPAC data is missing it', async () => {
      const user = await createTestUser({ _id: testUserId });
      const sigpacPropsWithoutAlt = { ...mockSigpacGeoJSONFeatureProperties };
      // @ts-expect-error // Testing missing property
      delete sigpacPropsWithoutAlt.altitud;

      (axios.get as jest.Mock).mockImplementation(url => {
        if (url === getGeoJSONSigpacUrl(mockLng, mockLat)) {
          return Promise.resolve({
            data: {
              features: [
                {
                  type: 'Feature',
                  properties: sigpacPropsWithoutAlt,
                  geometry: mockSigpacGeoJSONPolygon,
                },
              ],
            },
          });
        }
        return mockAxiosGetImplementation(url);
      });

      const createdParcel = await parcelService.createParcel(
        user._id as unknown as string,
        parcelInputData,
      );
      expect(createdParcel.altitude).toBe(0);
    });

    it('should use default 0 for surface if SIGPAC dn_surface is missing or zero', async () => {
      const user = await createTestUser({ _id: testUserId });
      const sigpacPropsWithoutSurface = { ...mockSigpacGeoJSONFeatureProperties };
      // @ts-expect-error // Testing missing property
      delete sigpacPropsWithoutSurface.dn_surface;

      (axios.get as jest.Mock).mockImplementation(url => {
        if (url === getGeoJSONSigpacUrl(mockLng, mockLat)) {
          return Promise.resolve({
            data: {
              features: [
                {
                  type: 'Feature',
                  properties: sigpacPropsWithoutSurface,
                  geometry: mockSigpacGeoJSONPolygon,
                },
              ],
            },
          });
        }
        return mockAxiosGetImplementation(url);
      });

      const createdParcel = await parcelService.createParcel(
        user._id as unknown as string,
        parcelInputData,
      );
      expect(createdParcel.surface).toBe(0);

      // Test with dn_surface as 0
      const sigpacPropsWithZeroSurface = { ...mockSigpacGeoJSONFeatureProperties, dn_surface: 0 };
      (axios.get as jest.Mock).mockImplementation(url => {
        if (url === getGeoJSONSigpacUrl(mockLng, mockLat)) {
          return Promise.resolve({
            data: {
              features: [
                {
                  type: 'Feature',
                  properties: sigpacPropsWithZeroSurface,
                  geometry: mockSigpacGeoJSONPolygon,
                },
              ],
            },
          });
        }
        return mockAxiosGetImplementation(url);
      });
      const createdParcel2 = await parcelService.createParcel(
        user._id as unknown as string,
        parcelInputData,
      );
      expect(createdParcel2.surface).toBe(0);
    });

    it('should return original code if mapUsoSigpac finds no match', async () => {
      const user = await createTestUser({ _id: testUserId });
      const unmappedUsoSigpac = 'ZZ'; // A code not in mockSigpacUsoResponse
      const sigpacPropsWithUnmappedUso = {
        ...mockSigpacGeoJSONFeatureProperties,
        uso_sigpac: unmappedUsoSigpac,
      };

      (axios.get as jest.Mock).mockImplementation(url => {
        if (url === getGeoJSONSigpacUrl(mockLng, mockLat)) {
          return Promise.resolve({
            data: {
              features: [
                {
                  type: 'Feature',
                  properties: sigpacPropsWithUnmappedUso,
                  geometry: mockSigpacGeoJSONPolygon,
                },
              ],
            },
          });
        }
        // Ensure USO_SIGPAC_URL returns data that doesn't include 'ZZ'
        if (url === USO_SIGPAC_URL) {
          return Promise.resolve({
            status: 200,
            data: { codigos: [{ codigo: 'TA', descripcion: 'Tierras Arables' }] },
          });
        }
        return mockAxiosGetImplementation(url);
      });

      // Mock the internal validParcelUse method to return true for this test
      jest.spyOn(parcelService as any, 'validParcelUse').mockReturnValue(true);
      const createdParcel = await parcelService.createParcel(
        user._id as unknown as string,
        parcelInputData,
      );
      expect(createdParcel.parcelUse).toBe(unmappedUsoSigpac);
    });

    it('should throw error from mapUsoSigpac if no response was given by sigpac', async () => {
      const user = await createTestUser({ _id: testUserId });
      const sigpacPropsWithUnmappedUso = {
        ...mockSigpacGeoJSONFeatureProperties,
        uso_sigpac: 'TA',
      };

      (axios.get as jest.Mock).mockImplementation(url => {
        if (url === getGeoJSONSigpacUrl(mockLng, mockLat)) {
          return Promise.resolve({
            data: {
              features: [
                {
                  type: 'Feature',
                  properties: sigpacPropsWithUnmappedUso,
                  geometry: mockSigpacGeoJSONPolygon,
                },
              ],
            },
          });
        }
        // Ensure USO_SIGPAC_URL returns data that doesn't include 'ZZ'
        if (url === USO_SIGPAC_URL) {
          return Promise.resolve({ status: 500 });
        }
        return mockAxiosGetImplementation(url);
      });

      // Mock the internal validParcelUse method to return true for this test
      jest.spyOn(parcelService as any, 'validParcelUse').mockReturnValue(true);
      await expect(
        parcelService.createParcel(user._id as unknown as string, parcelInputData),
      ).rejects.toThrow(
        'Failed to create parcel: Failed to fetch GeoJSON from Sigpac: Error mapping SIGPAC usage code: No response from Sigpac',
      );
    });

    it('should throw error from getLocationInfo if province code not found in CAPITAL_NAMES', async () => {
      const user = await createTestUser({ _id: testUserId });
      const invalidProvinceCode = 999;
      const sigpacPropsInvalidProvince = {
        ...mockSigpacGeoJSONFeatureProperties,
        provincia: invalidProvinceCode,
      };

      (axios.get as jest.Mock).mockImplementation(url => {
        if (url === getGeoJSONSigpacUrl(mockLng, mockLat)) {
          return Promise.resolve({
            data: {
              features: [
                {
                  type: 'Feature',
                  properties: sigpacPropsInvalidProvince,
                  geometry: mockSigpacGeoJSONPolygon,
                },
              ],
            },
          });
        }
        return mockAxiosGetImplementation(url);
      });

      await expect(
        parcelService.createParcel(user._id as unknown as string, parcelInputData),
      ).rejects.toThrow(
        `Failed to create parcel: Failed to fetch GeoJSON from Sigpac: Failed to get location info: Province code ${invalidProvinceCode} not found in capital names`,
      );
    });
  });

  describe('getParcelByCoordinates', () => {
    let user: IUser;

    beforeEach(async () => {
      user = await createTestUser({ _id: testUserId });
      (userService.getUserById as jest.Mock).mockResolvedValue(user);
      (axios.get as jest.Mock).mockImplementation(mockAxiosGetImplementation);

      const { Aemet: MockedAemet } = jest.requireMock('aemet-api');
      const mockAemetInstance = new MockedAemet();
      (mockAemetInstance.getWeatherByCoordinates as jest.Mock).mockResolvedValue(
        mockAemetWeatherResponseData,
      );
    });

    it('should return parcel from DB if registered, along with owner and weather', async () => {
      const parcelDataForDB: Partial<IParcel> = {
        geometry: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: mockSigpacGeoJSONPolygon,
              properties: { name: 'polygon' },
            },
            {
              type: 'Feature',
              geometry: mockSigpacGeoJSONPoint,
              properties: { name: 'pointOnFeature' },
            },
          ],
        },
        crop: CropType.CEREALS,
        provinceCode: 28,
        provinceName: 'Madrid',
        municipalityCode: 79,
        municipalityName: 'Madrid',
        parcelUse: 'Tierras Arables',
        surface: 10,
        coefRegadio: 50,
        altitude: 600,
        products: [],
      };

      const dbParcel = await ParcelModel.create(parcelDataForDB);
      user.parcels.push(dbParcel._id as ObjectId); // Simulate user owning this parcel
      await user.save();

      const result = await parcelService.getParcelByCoordinates(testUserId, mockLng, mockLat);

      expect(result.parcel).toHaveProperty('_id');
      expect(result).toHaveProperty('owner');
      expect(typeof result.weather).toBe('object');
      expect(result.weather).not.toBe('string');
      expect(userService.getUserById).toHaveBeenCalledWith(testUserId);
    });

    it('should return parcel from SIGPAC if not registered, with weather but no owner', async () => {
      const result = await parcelService.getParcelByCoordinates(testUserId, mockLng, mockLat);

      expect(result.parcel).toBeDefined();
      expect(result.parcel).not.toHaveProperty('_id');
      expect(result.parcel.provinceName).toBe('Madrid');
      expect(result.parcel.municipalityName).toBe('Madrid');
      expect(result.parcel.parcelUse).toBe('Tierras Arables');
      expect(typeof result.weather).toBe('object');
      expect(result.weather).not.toBe('string');
      expect(result).not.toHaveProperty('owner');
    });

    it('should throw error if user not found by userService', async () => {
      (userService.getUserById as jest.Mock).mockResolvedValue(null);
      await expect(
        parcelService.getParcelByCoordinates(testUserId, mockLng, mockLat),
      ).rejects.toThrow('No se pudo obtener la parcela: Usuario no encontrado');
    });

    it('should return parcel data even if AEMET weather fetch fails', async () => {
      const { Aemet: MockedAemetForFailure } = jest.requireMock('aemet-api');
      const aemetInstanceForFailure = new MockedAemetForFailure();
      (aemetInstanceForFailure.getWeatherByCoordinates as jest.Mock).mockResolvedValue(undefined);

      const result = await parcelService.getParcelByCoordinates(testUserId, mockLng, mockLat);
      expect(result.parcel).toBeDefined();
      expect(result.weather).toBe('Could not retrieve weather data from AEMET');
    });

    it('should throw error if SIGPAC fetch fails', async () => {
      (axios.get as jest.Mock).mockImplementation(url => {
        if (url === getGeoJSONSigpacUrl(mockLng, mockLat)) {
          return Promise.reject(new Error('SIGPAC API down'));
        }
        return mockAxiosGetImplementation(url);
      });
      await expect(
        parcelService.getParcelByCoordinates(testUserId, mockLng, mockLat),
      ).rejects.toThrow(
        'No se pudo obtener la parcela: Failed to fetch GeoJSON from Sigpac: SIGPAC API down',
      );
    });
  });

  describe('getAllParcels', () => {
    it('should return all parcels for a user', async () => {
      const user = await createTestUser({ _id: testUserId });
      const parcelData = {
        crop: CropType.CEREALS,
        provinceCode: 28,
        provinceName: 'Madrid',
        municipalityCode: 79,
        municipalityName: 'Madrid',
        parcelUse: 'TA',
        surface: 10,
        geometry: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: mockSigpacGeoJSONPolygon,
              properties: { name: 'polygon' },
            },
            {
              type: 'Feature',
              geometry: mockSigpacGeoJSONPoint,
              properties: { name: 'pointOnFeature' },
            },
          ],
        },
        products: [],
      };

      const parcel1 = await ParcelModel.create(parcelData);
      const parcel2 = await ParcelModel.create({ ...parcelData, crop: CropType.FRUIT_TREES });
      user.parcels = [parcel1._id as ObjectId, parcel2._id as ObjectId];
      await user.save();

      const parcels = await parcelService.getAllParcels(testUserId);

      expect(parcels).toHaveLength(2);
      // Ensure the populated parcel data is returned (mongoose .populate behavior)
      expect(parcels[0].crop).toBe(CropType.CEREALS);
      expect(parcels[1].crop).toBe(CropType.FRUIT_TREES);
    });

    it('should return an empty array if user has no parcels', async () => {
      await createTestUser({ _id: testUserId }); // User exists but has no parcels
      const parcels = await parcelService.getAllParcels(testUserId);
      expect(parcels).toHaveLength(0);
    });

    it('should throw an error if user not found', async () => {
      const nonExistentUserId = new Types.ObjectId().toString();
      await expect(parcelService.getAllParcels(nonExistentUserId)).rejects.toThrow(
        'Failed to get all parcels: User not found',
      );
    });
  });
});
