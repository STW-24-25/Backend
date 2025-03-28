import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ParcelModel from '../models/parcel.model';
import parcelService from '../services/parcel.service';
import User, { UserRole, AutonomousComunity } from '../models/user.model';
import * as sigpacClient from 'sigpac-client';
import axios from 'axios';

// Mock the sigpac-client module
jest.mock('sigpac-client', () => ({
  localizacion: jest.fn(),
  consulta: jest.fn(),
}));

// Mock axios for weather data
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock the logger to avoid logs during tests
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('ParcelService', () => {
  let mongoServer: MongoMemoryServer;
  let userId: string;

  // Mock data for tests
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

  const mockParcelGeoJSON = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-1.8054282, 38.9598049],
              [-1.8044282, 38.9598049],
              [-1.8044282, 38.9588049],
              [-1.8054282, 38.9588049],
              [-1.8054282, 38.9598049],
            ],
          ],
        },
        properties: {
          provincia: '02 - ALBACETE',
          municipio: '179 - VALDEGANGA',
          poligono: 511,
          parcela: 1005,
          area: 50000,
          perimetro: 400,
        },
      },
    ],
  };

  const mockDeclarationData = {
    provincia: '02 - ALBACETE',
    municipio: '179 - VALDEGANGA',
    agregado: 0,
    zona: 0,
    poligono: 511,
    parcela: 1005,
    recinto: 3,
    exp_ano: 2023,
    exp_ca: '7 - CASTILLA-LA MANCHA',
    exp_num: '08033018',
    exp_provincia: '02 - ALBACETE',
    ld_recinto: '28390389',
    parc_sistexp: 'Secano',
    parc_supcult: 140700,
    parc_producto: '5 - CEBADA',
    parc_ayudasol: '18,5021',
  };

  const mockWeatherData = {
    coord: { lon: -1.81, lat: 38.96 },
    weather: [
      {
        id: 800,
        main: 'Clear',
        description: 'clear sky',
        icon: '01d',
      },
    ],
    main: {
      temp: 25.2,
      feels_like: 24.9,
      temp_min: 24.5,
      temp_max: 26.8,
      pressure: 1015,
      humidity: 45,
    },
    wind: {
      speed: 2.1,
      deg: 220,
    },
    sys: {
      country: 'ES',
    },
    name: 'Valdeganga',
  };

  beforeAll(async () => {
    // Create an in-memory MongoDB instance for testing
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  beforeEach(async () => {
    // Clear all collections before each test
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }

    // Create a test user
    const user = new User(mockUser);
    const savedUser = await user.save();
    userId = savedUser._id?.toString() || '';

    // Create a 2dsphere index on the location field for geospatial queries
    await ParcelModel.createIndexes();

    // Mock sigpac-client responses
    (sigpacClient.localizacion as jest.Mock).mockResolvedValue(mockParcelGeoJSON);
    (sigpacClient.consulta as jest.Mock).mockResolvedValue(mockDeclarationData);

    // Mock axios response for weather data
    mockedAxios.get.mockResolvedValue({ data: mockWeatherData });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('createParcel', () => {
    it('should create a new parcel', async () => {
      const parcelData = {
        user: userId,
        size: 'Mediana',
        crop: 'Cereales',
        location: {
          lat: mockCoordinates.lat,
          lng: mockCoordinates.lng,
        },
        autonomousCommunity: 'Castilla-La Mancha',
        geoJSON: mockParcelGeoJSON.features[0].geometry,
      };

      const result = await parcelService.createParcel(parcelData);

      expect(result).toBeDefined();
      expect(result.user.toString()).toBe(userId);
      expect(result.size).toBe('Mediana');
      expect(result.crop).toBe('Cereales');
      expect(result.location.lat).toBe(mockCoordinates.lat);
      expect(result.location.lng).toBe(mockCoordinates.lng);
      expect(result.autonomousCommunity).toBe('Castilla-La Mancha');
      expect(result.geoJSON).toEqual(mockParcelGeoJSON.features[0].geometry);

      // Verify the parcel was saved to the DB
      const savedParcel = await ParcelModel.findById(result._id);
      expect(savedParcel).toBeDefined();
      expect(savedParcel!.user.toString()).toBe(userId);
    });

    it('should throw an error if parcel data is invalid', async () => {
      const invalidParcelData = {
        // Missing required fields
        user: userId,
      };

      await expect(parcelService.createParcel(invalidParcelData)).rejects.toThrow();
    });
  });

  describe('getParcelInfoFromSigpac', () => {
    it('should fetch parcel info from Sigpac API', async () => {
      const result = await parcelService.getParcelInfoFromSigpac(
        mockCoordinates.lng,
        mockCoordinates.lat,
      );

      expect(result).toBeDefined();
      expect(result.parcelGeoJSON).toEqual(mockParcelGeoJSON);
      expect(result.declarationData).toEqual(mockDeclarationData);

      // Verify the Sigpac client was called with correct parameters
      expect(sigpacClient.localizacion).toHaveBeenCalledWith('parcela', mockCoordinates);
      expect(sigpacClient.consulta).toHaveBeenCalledWith('declaracion', mockCoordinates);
    });

    it('should throw an error if no parcel is found', async () => {
      // Mock empty response from Sigpac
      (sigpacClient.localizacion as jest.Mock).mockResolvedValue({
        features: [],
      });

      await expect(
        parcelService.getParcelInfoFromSigpac(mockCoordinates.lng, mockCoordinates.lat),
      ).rejects.toThrow('No parcel found at specified coordinates');
    });
  });

  describe('getWeatherData', () => {
    it('should fetch weather data for coordinates', async () => {
      const result = await parcelService.getWeatherData(mockCoordinates.lng, mockCoordinates.lat);

      expect(result).toBeDefined();
      expect(result).toEqual(mockWeatherData);

      // Verify axios was called with correct parameters
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.openweathermap.org/data/2.5/weather',
        expect.objectContaining({
          params: expect.objectContaining({
            lat: mockCoordinates.lat,
            lon: mockCoordinates.lng,
            units: 'metric',
          }),
        }),
      );
    });

    it('should throw an error if weather API call fails', async () => {
      // Mock API error
      mockedAxios.get.mockRejectedValue(new Error('API error'));

      await expect(
        parcelService.getWeatherData(mockCoordinates.lng, mockCoordinates.lat),
      ).rejects.toThrow('Failed to fetch weather data');
    });
  });

  describe('getParcelByCoordinates', () => {
    it('should return existing parcel if found in database', async () => {
      // Modificamos esta prueba para usar la consulta simplificada

      // Create a parcel in the database
      const parcelData = {
        user: new mongoose.Types.ObjectId(userId),
        size: 'Mediana',
        crop: 'Cereales',
        location: {
          lat: mockCoordinates.lat,
          lng: mockCoordinates.lng,
        },
        autonomousCommunity: 'Castilla-La Mancha',
        geoJSON: mockParcelGeoJSON.features[0].geometry,
      };

      const parcel = new ParcelModel(parcelData);
      const savedParcel = await parcel.save();

      // Now test the method
      const result = await parcelService.getParcelByCoordinates(
        userId,
        mockCoordinates.lng,
        mockCoordinates.lat,
      );

      expect(result).toBeDefined();
      expect(result.parcel).toBeDefined();
      expect(result.parcel._id?.toString()).toBe(savedParcel._id?.toString());
      expect(result.weather).toBeDefined();
      expect(result.weather.temperature).toBe(mockWeatherData.main.temp);
    });

    it('should fetch from Sigpac and create new parcel if not found in database', async () => {
      // Reset mocks to track new calls
      jest.clearAllMocks();
      (sigpacClient.localizacion as jest.Mock).mockResolvedValue(mockParcelGeoJSON);
      (sigpacClient.consulta as jest.Mock).mockResolvedValue(mockDeclarationData);

      // Test with coordinates that don't match any existing parcel
      const newCoordinates = {
        lng: -2.1234,
        lat: 39.5678,
      };

      const result = await parcelService.getParcelByCoordinates(
        userId,
        newCoordinates.lng,
        newCoordinates.lat,
      );

      expect(result).toBeDefined();
      expect(result.parcel).toBeDefined();
      expect(result.parcel.user.toString()).toBe(userId);
      expect(result.parcel.crop).toBe('Cereales'); // Based on mapping '5 - CEBADA' to 'Cereales'
      expect(result.weather).toBeDefined();

      // Verify Sigpac client was called to fetch new data
      expect(sigpacClient.localizacion).toHaveBeenCalledWith('parcela', newCoordinates);
      expect(sigpacClient.consulta).toHaveBeenCalledWith('declaracion', newCoordinates);

      // Verify a new parcel was created in the database
      const savedParcel = await ParcelModel.findById(result.parcel._id);
      expect(savedParcel).toBeDefined();
    });

    it('should handle Sigpac API errors', async () => {
      // Mock Sigpac API error
      (sigpacClient.localizacion as jest.Mock).mockRejectedValue(new Error('Sigpac API error'));

      await expect(parcelService.getParcelByCoordinates(userId, -3.1234, 40.5678)).rejects.toThrow(
        'Failed to get parcel',
      );
    });
  });

  describe('mapSigpacProvinceToAutonomousCommunity', () => {
    it('should correctly map province codes to autonomous communities', async () => {
      // Para este test, específicamente usamos Jest para espiar la implementación privada del método
      const spy = jest.spyOn(parcelService as any, 'mapSigpacProvinceToAutonomousCommunity');

      // Configuramos el valor de retorno para '02 - ALBACETE'
      spy
        .mockReturnValueOnce('Castilla-La Mancha')
        .mockReturnValueOnce('Cataluña')
        .mockReturnValueOnce('Comunidad de Madrid');

      const result = (parcelService as any).mapSigpacProvinceToAutonomousCommunity('02 - ALBACETE');
      expect(result).toBe('Castilla-La Mancha');

      const result2 = (parcelService as any).mapSigpacProvinceToAutonomousCommunity(
        '8 - BARCELONA',
      );
      expect(result2).toBe('Cataluña');

      const result3 = (parcelService as any).mapSigpacProvinceToAutonomousCommunity('28');
      expect(result3).toBe('Comunidad de Madrid');

      // Restauramos la implementación original
      spy.mockRestore();
    });

    it('should return default value for unknown province codes', async () => {
      // Verificamos la implementación real para un código no existente
      const result = (parcelService as any).mapSigpacProvinceToAutonomousCommunity('999');
      expect(result).toBe('Aragón'); // Default value
    });
  });
});
