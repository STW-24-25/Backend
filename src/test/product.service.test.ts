import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Types } from 'mongoose';
import productService from '../services/product.service';
import ProductModel, { IProduct, ProductSector } from '../models/product.model';
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
      image: 'limon.jpg',
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
      image: 'trigo_duro.jpg',
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
    ]) as Promise<IProduct[]>;
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
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

  afterAll(async () => {
    await clearDatabase();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('getProductsByName', () => {
    it('should return all products with signed image URLs if images exist', async () => {
      await createTestProducts();
      (S3Service.getSignedUrl as jest.Mock).mockImplementation(
        async key => `https://mocked-s3-url/${key}`,
      );

      const result = await productService.getProductsByName('');
      expect(result).toBeDefined();
      expect(result.products.length).toBe(3);

      const productWithImage = result.products.find(p => p.name === 'Limón');
      expect(productWithImage).toBeDefined();
      expect(productWithImage!.image).toBe('https://mocked-s3-url/limon.jpg');
      expect(S3Service.getSignedUrl).toHaveBeenCalledWith('limon.jpg');

      const productWithoutImage = result.products.find(p => p.name === 'Trigo blando panificable');
      expect(productWithoutImage).toBeDefined();
      expect(productWithoutImage!.image).toBeNull();

      const anotherProductWithImage = result.products.find(p => p.name === 'Trigo duro');
      expect(anotherProductWithImage).toBeDefined();
      expect(anotherProductWithImage!.image).toBe('https://mocked-s3-url/trigo_duro.jpg');
      expect(S3Service.getSignedUrl).toHaveBeenCalledWith('trigo_duro.jpg');
    });

    it('should return products, with null image URL if product has no image field', async () => {
      await ProductModel.create({
        _id: new Types.ObjectId('67ed50bf1bb8c97622f74337'),
        name: 'Cebada sin imagen',
        sector: ProductSector.CEREALS,
        prices: [{ date: new Date(), price: 0.2 }],
      });
      const result = await productService.getProductsByName('Cebada sin imagen');
      expect(result.products.length).toBe(1);
      expect(result.products[0].image).toBeNull();
      expect(S3Service.getSignedUrl).not.toHaveBeenCalled();
    });

    it('should return product with null image URL if S3Service.getSignedUrl fails, and log error', async () => {
      await createTestProducts(); // Creates 'Limón' with image 'limon.jpg'
      const s3Error = new Error('S3 failed to get signed URL');
      (S3Service.getSignedUrl as jest.Mock).mockImplementation(async key => {
        if (key === 'limon.jpg') {
          throw s3Error;
        }
        return `https://mocked-s3-url/${key}`; // Other images should still work
      });

      const result = await productService.getProductsByName('');

      expect(result).toBeDefined();
      const limonProduct = result.products.find(p => p.name === 'Limón');
      expect(limonProduct).toBeDefined();
      expect(limonProduct!.image).toBeNull(); // Image should be null due to S3 error

      const trigoDuroProduct = result.products.find(p => p.name === 'Trigo duro');
      expect(trigoDuroProduct).toBeDefined();
      expect(trigoDuroProduct!.image).toBe('https://mocked-s3-url/trigo_duro.jpg'); // This one should still have its image
    });

    it('should return all products when no name, page, or size is provided', async () => {
      await createTestProducts(); // Creates 3 products
      const result = await productService.getProductsByName(''); // No page/size

      expect(result).toBeDefined();
      expect(result.products.length).toBe(3);
      expect(result.totalProducts).toBe(3);
      expect(result.page).toBe(1); // Default page
      expect(result.pageSize).toBe(3); // Defaults to totalProducts when no pageSize
      expect(result.totalPages).toBe(1); // totalProducts / totalProducts (default pageSize)
    });

    it('should return paginated products when name, page, and size are provided', async () => {
      await createTestProducts(); // Creates 3 products, 2 with 'Trigo'
      const result = await productService.getProductsByName('Trigo', 1, 1); // Page 1, Size 1

      expect(result).toBeDefined();
      expect(result.products.length).toBe(1); // Only 1 product due to pageSize
      expect(result.totalProducts).toBe(2); // Total 'Trigo' products
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(1);
      expect(result.totalPages).toBe(2); // Math.ceil(2 / 1)
    });

    it('should correctly calculate totalPages with Math.ceil when totalProducts is not a multiple of pageSize', async () => {
      // Create 5 products
      await createTestProducts(); // 3 products
      await ProductModel.create({
        _id: new Types.ObjectId(),
        name: 'Avena',
        sector: ProductSector.CEREALS,
        prices: [{ date: new Date(), price: 0.15 }],
      });
      await ProductModel.create({
        _id: new Types.ObjectId(),
        name: 'Centeno',
        sector: ProductSector.CEREALS,
        prices: [{ date: new Date(), price: 0.18 }],
      });
      // Now we have 5 products in total

      const pageNumber = 1;
      const pageSize = 3;
      const result = await productService.getProductsByName('', pageNumber, pageSize);

      expect(result).toBeDefined();
      expect(result.products.length).toBe(3); // Products on page 1
      expect(result.totalProducts).toBe(5);
      expect(result.page).toBe(pageNumber);
      expect(result.pageSize).toBe(pageSize);
      expect(result.totalPages).toBe(2); // Math.ceil(5 / 3) = 2
    });

    it('should handle request for a page beyond totalPages gracefully', async () => {
      await createTestProducts(); // 3 products
      const pageNumber = 10; // A page that doesn't exist
      const pageSize = 2;
      const result = await productService.getProductsByName('', pageNumber, pageSize);

      expect(result).toBeDefined();
      expect(result.products.length).toBe(0); // No products on this page
      expect(result.totalProducts).toBe(3);
      expect(result.page).toBe(pageNumber);
      expect(result.pageSize).toBe(pageSize);
      expect(result.totalPages).toBe(2); // Math.ceil(3 / 2) = 2
    });
  });

  describe('getProductById', () => {
    it('should return the product with a signed image URL if image exists', async () => {
      const products = await createTestProducts();
      const productWithImage = products.find(p => p.name === 'Limón')!;
      (S3Service.getSignedUrl as jest.Mock).mockResolvedValue(
        `https://mocked-s3-url/${productWithImage.image}`,
      );

      const result = await productService.getProductById(productWithImage._id as unknown as string);
      expect(result).toBeDefined();
      expect(result!.image).toBe(`https://mocked-s3-url/${productWithImage.image}`);
      expect(S3Service.getSignedUrl).toHaveBeenCalledWith(productWithImage.image);
    });

    it('should return the product with a null image URL if product has no image field', async () => {
      const products = await createTestProducts();
      const productWithoutImage = products.find(p => p.name === 'Trigo blando panificable')!;
      await ProductModel.findByIdAndUpdate(productWithoutImage._id, { $unset: { image: '' } });

      const result = await productService.getProductById(
        productWithoutImage._id as unknown as string,
      );
      expect(result).toBeDefined();
      expect(result!.image).toBeNull();
      expect(S3Service.getSignedUrl).not.toHaveBeenCalled();
    });

    it('should return undefined', async () => {
      await createTestProducts();
      const result = await productService.getProductById(new Types.ObjectId().toString());

      expect(result).not.toBeDefined();
    });
  });

  it('should return product with null image URL if S3Service.getSignedUrl fails, and log error', async () => {
    const products = await createTestProducts();
    const productWithImage = products.find(p => p.name === 'Limón')!;
    const s3Error = new Error('S3 failed for getProductById');
    (S3Service.getSignedUrl as jest.Mock).mockRejectedValue(s3Error);

    const result = await productService.getProductById(productWithImage._id as unknown as string);

    expect(result).toBeDefined();
    expect(result!.image).toBeNull(); // Image should be null due to S3 error
    expect(S3Service.getSignedUrl).toHaveBeenCalledWith(productWithImage.image);
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
