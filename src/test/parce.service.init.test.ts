describe('ParcelService Initialization', () => {
  const originalAemetApiKey = process.env.AEMET_API_KEY;

  beforeEach(() => {
    jest.resetModules(); // Crucial for re-evaluating the service module
    // We don't set up a full Mongoose connection here as we're only testing
    // the API key check which happens before DB interactions.
    // We also need to mock Aemet if its constructor is called during service import.
    jest.mock('aemet-api', () => ({
      Aemet: jest.fn().mockImplementation(() => ({
        // Add any methods that might be called during Aemet instantiation or service import
        getWeatherByCoordinates: jest.fn(),
      })),
    }));
    // Mock any other direct imports in parcel.service.ts that might cause issues
    // if their modules are not fully functional without a DB (e.g., models)
    jest.mock('../models/parcel.model', () => ({}));
    jest.mock('../models/product.model', () => ({}));
    jest.mock('../models/user.model', () => ({}));
    jest.mock('../services/user.service', () => ({}));
    jest.mock('../utils/logger', () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }));
  });

  afterEach(() => {
    process.env.AEMET_API_KEY = originalAemetApiKey;
  });

  it('should throw an error if AEMET_API_KEY is not defined', () => {
    delete process.env.AEMET_API_KEY;
    expect(() => {
      require('../services/parcel.service');
    }).toThrow('No AEMET API key found');
  });

  it('should not throw an error if AEMET_API_KEY is defined', () => {
    process.env.AEMET_API_KEY = 'test-key-for-init';
    expect(() => {
      require('../services/parcel.service');
    }).not.toThrow();
  });
});
