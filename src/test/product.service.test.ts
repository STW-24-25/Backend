import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Types } from 'mongoose';
import productService from '../services/product.service';
import Product, { ProductSector } from '../models/product.model';

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('ProductService', () => {
  let mongoServer: MongoMemoryServer;

  const clearDatabase = async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  };

  const createTestProducts = async () => {
    const testProductData1 = {
      _id: '67ed50bf1bb8c97622f74334',
      name: 'Limón',
      sector: ProductSector.FRUITS,
      prices: [
        {
          date: new Date('2024-08-07T00:00:00Z'),
          price: 0.2873,
        },
        {
          date: new Date('2025-08-14T00:00:00Z'),
          price: 0.2911,
        },
        {
          date: new Date('2024-08-21T00:00:00Z'),
          price: 0.2878,
        },
        {
          date: new Date('2024-08-28T00:00:00Z'),
          price: 0.2856,
        },
        {
          date: new Date('2025-01-05T00:00:00Z'),
          price: 0.2875,
        },
        {
          date: new Date('2025-01-12T00:00:00Z'),
          price: 0.2914,
        },
        {
          date: new Date('2025-01-19T00:00:00Z'),
          price: 0.2873,
        },
        {
          date: new Date('2025-01-26T00:00:00Z'),
          price: 0.2859,
        },
      ],
    };

    const testProductData2 = {
      _id: '67ed50bf1bb8c97622f74335',
      name: 'Trigo blando panificable',
      sector: ProductSector.CEREALS,
      prices: [
        {
          date: new Date('2024-08-07T00:00:00Z'),
          price: 0.2873,
        },
        {
          date: new Date('2025-08-14T00:00:00Z'),
          price: 0.2911,
        },
        {
          date: new Date('2024-08-21T00:00:00Z'),
          price: 0.2878,
        },
        {
          date: new Date('2024-08-28T00:00:00Z'),
          price: 0.2856,
        },
        {
          date: new Date('2025-01-05T00:00:00Z'),
          price: 0.2875,
        },
        {
          date: new Date('2025-01-12T00:00:00Z'),
          price: 0.2914,
        },
        {
          date: new Date('2025-01-19T00:00:00Z'),
          price: 0.2873,
        },
        {
          date: new Date('2025-01-26T00:00:00Z'),
          price: 0.2859,
        },
      ],
    };

    const testProductData3 = {
      _id: '67ed50bf1bb8c97622f74336',
      name: 'Trigo duro',
      sector: ProductSector.CEREALS,
      prices: [
        {
          date: new Date('2024-08-07T00:00:00Z'),
          price: 0.2873,
        },
        {
          date: new Date('2025-08-14T00:00:00Z'),
          price: 0.2911,
        },
        {
          date: new Date('2024-08-21T00:00:00Z'),
          price: 0.2878,
        },
        {
          date: new Date('2024-08-28T00:00:00Z'),
          price: 0.2856,
        },
        {
          date: new Date('2025-01-05T00:00:00Z'),
          price: 0.2875,
        },
        {
          date: new Date('2025-01-12T00:00:00Z'),
          price: 0.2914,
        },
        {
          date: new Date('2025-01-19T00:00:00Z'),
          price: 0.2873,
        },
        {
          date: new Date('2025-01-26T00:00:00Z'),
          price: 0.2859,
        },
      ],
    };

    return Promise.all([
      new Product(testProductData1).save(),
      new Product(testProductData2).save(),
      new Product(testProductData3).save(),
    ]);
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    await clearDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  afterEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await clearDatabase();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('getProductsByName', () => {
    it('should return all products', async () => {
      await createTestProducts();
      const result = await productService.getProductsByName('', 1, 16);

      expect(result).toBeDefined();
      expect(result.products.length).toBe(3);
      expect(result.totalProducts).toBe(3);
    });

    it('should return the products with trigo in their name', async () => {
      await createTestProducts();
      const result = await productService.getProductsByName('trigo', 1, 16);

      expect(result).toBeDefined();
      expect(result.products.length).toBe(2);
      expect(result.totalProducts).toBe(2);
      expect(result.products[0].name).toMatch(/trigo/i);
      expect(result.products[1].name).toMatch(/trigo/i);
    });
  });

  describe('getProductById', () => {
    it('should return the product with the id', async () => {
      await createTestProducts();
      const result = await productService.getProductById('67ed50bf1bb8c97622f74335');

      expect(result).toBeDefined();
      expect((result!.id as unknown as Types.ObjectId).toString()).toBe('67ed50bf1bb8c97622f74335');
    });

    it('should return undefined', async () => {
      await createTestProducts();
      const result = await productService.getProductById(new Types.ObjectId().toString());

      expect(result).not.toBeDefined();
    });
  });
});
