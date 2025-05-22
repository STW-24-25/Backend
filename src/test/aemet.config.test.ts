describe('AEMET Configuration', () => {
  const originalAemetApiKey = process.env.AEMET_API_KEY;

  beforeEach(() => {
    jest.resetModules(); // Crucial for re-evaluating the service module

    jest.mock('../utils/logger', () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }));
  });

  afterEach(() => {
    // Restore the original environment variable
    if (originalAemetApiKey) {
      process.env.AEMET_API_KEY = originalAemetApiKey;
    } else {
      delete process.env.AEMET_API_KEY;
    }
  });

  it('should throw an error if AEMET_API_KEY is not defined', () => {
    // Ensure the environment variable is deleted
    delete process.env.AEMET_API_KEY;

    // Now require the config file which should throw
    expect(() => {
      require('../config/aemet.config');
    }).toThrow('No AEMET API key found');
  });

  it('should not throw an error if AEMET_API_KEY is defined', () => {
    // Set a test API key
    process.env.AEMET_API_KEY = 'test-key-for-init';

    // Now require the config file, which should not throw
    expect(() => {
      require('../config/aemet.config');
    }).not.toThrow();
  });
});
