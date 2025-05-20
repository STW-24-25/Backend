import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Types } from 'mongoose';
import productService from '../services/product.service';
import ProductModel, { ProductSector } from '../models/product.model';
import S3Service from '../services/s3.service'; // Import S3Service

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('sharp', () => () => ({
  resize: () => ({
    jpeg: () => ({ toBuffer: jest.fn().mockResolvedValue(Buffer.from('mocked-image')) }),
  }),
}));

jest.mock('../services/s3.service');

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
      new ProductModel(testProductData1).save(),
      new ProductModel(testProductData2).save(),
      new ProductModel(testProductData3).save(),
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

    jest.clearAllMocks();
    (S3Service.getSignedUrl as jest.Mock).mockResolvedValue('https://mocked-s3-url');
    (S3Service.processImage as jest.Mock).mockResolvedValue(Buffer.from('processed-image'));
    (S3Service.generateProductImageKey as jest.Mock).mockReturnValue(
      'products/images/mock-key.jpg',
    );
    (S3Service.uploadFile as jest.Mock).mockResolvedValue('mocked-s3-key');
    (S3Service.getDefaultProfilePictureUrl as jest.Mock).mockResolvedValue(
      'https://mocked-default-profile-url',
    ); // If needed by product service indirectly
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
      const result = await productService.getProductsByName('');

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

  describe('getPriceDiff', () => {
    it('debería calcular la diferencia de precio correctamente', () => {
      const data = [
        { date: new Date('2024-01-01'), price: 10 },
        { date: new Date('2024-02-01'), price: 15 },
        { date: new Date('2024-03-01'), price: 20 },
        { date: new Date('2024-04-01'), price: 25 },
      ];
      const diff = productService.getPriceDiff(data, 2); // 2 meses atrás
      expect(diff).toBe(25 - 10);
    });
    it('debería devolver la diferencia con el primer precio si el periodo es mayor que el historial', () => {
      const data = [
        { date: new Date('2024-01-01'), price: 10 },
        { date: new Date('2024-02-01'), price: 15 },
      ];
      const diff = productService.getPriceDiff(data, 12); // periodo muy grande
      expect(diff).toBe(15 - 10);
    });
  });

  describe('refreshProductImages', () => {
    describe('refreshProductImages', () => {
      it('debería refrescar las imágenes de los productos', async () => {
        const [p1, p2] = await createTestProducts();
        p1.image = 'mocked-image-key1';
        p2.image = 'mocked-image-key2';
        await p1.save();
        await p2.save();
        const id1 = String(p1._id);
        const id2 = String(p2._id);

        (S3Service.getSignedUrl as jest.Mock).mockImplementation(
          async key => `https://mocked-s3-url/${key}`,
        );

        const result = await productService.refreshProductImages([id1, id2]);
        expect(S3Service.getSignedUrl).toHaveBeenCalledWith(p1.image);
        expect(S3Service.getSignedUrl).toHaveBeenCalledWith(p2.image);
        expect(result).toHaveProperty(id1);
        expect(result).toHaveProperty(id2);
        expect(result[id1]).toContain('https://mocked-s3-url/mocked-image-key1');
        expect(result[id2]).toContain('https://mocked-s3-url/mocked-image-key2');
      });
    });
  });

  describe('uploadProductImage', () => {
    it('debería subir una imagen de producto correctamente', async () => {
      const [p1] = await createTestProducts();
      const id1 = String(p1._id);
      const mockFile = {
        buffer: Buffer.from('fake'),
        mimetype: 'image/jpeg',
      } as Express.Multer.File;
      const result = await productService.uploadProductImage(id1, mockFile);
      expect(result).toBe('mocked-s3-key');
    });
    it('debería lanzar un error si el producto no existe', async () => {
      const mockFile = {
        buffer: Buffer.from('fake'),
        mimetype: 'image/jpeg',
      } as Express.Multer.File;
      await expect(
        productService.uploadProductImage(new mongoose.Types.ObjectId().toString(), mockFile),
      ).rejects.toThrow('Product not found');
    });
  });
});
