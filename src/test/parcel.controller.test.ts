import mongoose from 'mongoose';
import * as parcelController from '../controllers/parcel.controller';
import parcelService from '../services/parcel.service';
import { Request, Response } from 'express';

// Mock auth interface

// Mock the parcel service
jest.mock('../services/parcel.service', () => ({
  createParcel: jest.fn(),
  getParcelByCoordinates: jest.fn(),
  getAllParcels: jest.fn(),
}));

// Mock the logger to avoid logs during tests
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('ParcelController', () => {
  // Mock data for testing
  const userId = new mongoose.Types.ObjectId().toString();
  const mockCoordinates = {
    lng: -1.8054282,
    lat: 38.9598049,
  };

  const mockParcel = {
    _id: new mongoose.Types.ObjectId().toString(),
    geometry: {
      type: 'FeatureCollection',
      features: [
        {
          geometry: {
            type: 'Polygon',
            coordinates: [
              [[-0.127639761538193, 41.541507350426606]],
              [[-0.131800770699279, 41.545093020690565]],
            ],
          },
          type: 'Feature',
          properties: {
            name: 'polygon',
          },
        },
        {
          geometry: {
            type: 'Point',
            coordinates: [-0.1297398615341678, 41.54709554565112],
          },
          type: 'Feature',
          properties: {
            name: 'pointOnFeature',
          },
        },
      ],
    },
    products: [],
    provinceCode: 22,
    provinceName: 'Huesca',
    municipalityCode: '336',
    municipalityName: 'Valfarta',
    parcelUse: 'TIERRAS ARABLES',
    coefRegadio: 100,
    altitude: 362,
    surface: 102.92532935506046,
    createdAt: '2025-05-16T09:56:38.888Z',
  };

  const mockWeatherData = {
    main: {
      temperature: 20,
      windChillFactor: 20,
      relativeHumidity: 39,
      skyState: {
        value: '11',
        descripcion: 'Despejado',
      },
    },
    wind: {
      speed: 20,
      direction: 'O',
    },
    precipitation: {
      rain: 0,
      rainChance: 0,
      snow: 0,
      snowChance: 0,
      stormChance: 0,
    },
    date: '2025-05-16T12:00:00',
    hour: 12,
    distance: 1.0612565156217004,
    municipality: 'Valfarta',
  };

  // Create mock request and response objects
  const mockRequest = (data: any = {}): Request => {
    const req: Partial<Request> = {};
    req.body = data.body || {};
    req.params = data.params || {};
    req.query = data.query || {};

    if (data.user) {
      (req as Partial<Request>).auth = {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        role: data.user.role,
        isAdmin: data.user.isAdmin,
        isBlocked: data.user.isBlocked,
      };
    }

    return req as Request;
  };

  const mockResponse = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getParcel', () => {
    it('should return 400 if coordinates are invalid', async () => {
      const req = mockRequest({
        user: { id: userId },
        query: { lng: 'invalid', lat: 'invalid' },
      });
      const res = mockResponse();

      await parcelController.getParcel(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Valid longitude and latitude coordinates are required',
      });
    });

    it('should return parcel data if coordinates are valid', async () => {
      const req = mockRequest({
        user: { id: userId },
        query: { lng: mockCoordinates.lng.toString(), lat: mockCoordinates.lat.toString() },
      });
      const res = mockResponse();

      // Mock the service response
      const mockServiceResponse = {
        parcel: mockParcel,
        weather: mockWeatherData,
      };
      (parcelService.getParcelByCoordinates as jest.Mock).mockResolvedValue(mockServiceResponse);

      await parcelController.getParcel(req, res);

      expect(parcelService.getParcelByCoordinates).toHaveBeenCalledWith(
        userId,
        mockCoordinates.lng,
        mockCoordinates.lat,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockServiceResponse);
    });

    it('should return 404 if no parcel is found', async () => {
      const req = mockRequest({
        user: { id: userId },
        query: { lng: mockCoordinates.lng.toString(), lat: mockCoordinates.lat.toString() },
      });
      const res = mockResponse();

      // Mock service to throw "No parcel found" error
      (parcelService.getParcelByCoordinates as jest.Mock).mockRejectedValue(
        new Error('No parcel found at specified coordinates'),
      );

      await parcelController.getParcel(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'No parcel found at the specified coordinates',
      });
    });

    it('should return 500 if service throws an unexpected error', async () => {
      const req = mockRequest({
        user: { id: userId },
        query: { lng: mockCoordinates.lng.toString(), lat: mockCoordinates.lat.toString() },
      });
      const res = mockResponse();

      // Mock service to throw a generic error
      (parcelService.getParcelByCoordinates as jest.Mock).mockRejectedValue(
        new Error('Unexpected error'),
      );

      await parcelController.getParcel(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error retrieving parcel',
        error: 'Unexpected error',
      });
    });
  });

  describe('createParcel', () => {
    it('should create a parcel and return 201', async () => {
      const parcelData = {
        crop: 'Cereales',
        location: {
          lat: mockCoordinates.lat,
          lng: mockCoordinates.lng,
        },
        products: [],
      };

      const req = mockRequest({
        user: { id: userId },
        body: parcelData,
      });
      const res = mockResponse();

      // Mock service response
      (parcelService.createParcel as jest.Mock).mockResolvedValue(mockParcel);

      await parcelController.createParcel(req, res);

      expect(parcelService.createParcel).toHaveBeenCalledWith(userId, parcelData);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Parcel created successfully',
        parcel: mockParcel,
      });
    });

    it('should return 500 if service throws an error', async () => {
      const req = mockRequest({
        user: { id: userId },
        body: { crop: 'Cereales' },
      });
      const res = mockResponse();

      // Mock service to throw an error
      (parcelService.createParcel as jest.Mock).mockRejectedValue(
        new Error('Failed to create parcel'),
      );

      await parcelController.createParcel(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error creating parcel',
        error: 'Failed to create parcel',
      });
    });

    describe('getParcels', () => {
      it('should return all parcels for a user and return 200', async () => {
        const req = mockRequest({
          user: { id: userId }, // Ensures req.auth.id is set
        });
        const res = mockResponse();

        const mockUserParcels = [
          mockParcel,
          { ...mockParcel, _id: new mongoose.Types.ObjectId().toString() },
        ];
        (parcelService.getAllParcels as jest.Mock).mockResolvedValue(mockUserParcels);

        await parcelController.getParcels(req, res);

        expect(parcelService.getAllParcels).toHaveBeenCalledWith(userId);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockUserParcels);
      });

      it('should return 500 if service throws an error', async () => {
        const req = mockRequest({
          user: { id: userId },
        });
        const res = mockResponse();
        const errorMessage = 'Failed to retrieve parcels';
        (parcelService.getAllParcels as jest.Mock).mockRejectedValue(new Error(errorMessage));

        await parcelController.getParcels(req, res);

        expect(parcelService.getAllParcels).toHaveBeenCalledWith(userId);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          message: 'Error retrieving parcels',
          error: errorMessage,
        });
      });
    });
  });
});
