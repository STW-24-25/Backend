import ProductModel from '../models/product.model';
import S3Service from '../services/s3.service';
import logger from '../utils/logger';

class ProductService {
  async getProductsByName(name: string, pageNumber?: number, pageSize?: number) {
    const filter: any = {};
    if (name) filter.name = { $regex: name, $options: 'i' };

    let productsQuery = ProductModel.find(filter).lean();

    if (pageNumber && pageSize) {
      productsQuery = productsQuery.skip((pageNumber - 1) * pageSize).limit(pageSize);
    }

    const products = await productsQuery;

    const productsWithLastPrice = await Promise.all(
      products.map(async product => {
        const lastPrice = product.prices[product.prices.length - 1].price;
        let signedImageUrl = null;

        if (product.image) {
          try {
            signedImageUrl = await S3Service.getSignedUrl(product.image);
          } catch (err) {
            logger.error(`Failed to generate signed image url for product: ${err}`);
            signedImageUrl = null;
          }
        }

        return {
          id: product._id,
          name: product.name,
          sector: product.sector,
          lastPrice,
          image: signedImageUrl,
        };
      }),
    );

    const totalProducts = await ProductModel.countDocuments(filter);
    return {
      products: productsWithLastPrice,
      page: pageNumber || 1,
      pageSize: pageSize || totalProducts,
      totalProducts,
      totalPages: pageSize ? Math.ceil(totalProducts / pageSize) : 1,
    };
  }

  /**
   * Calculates the price difference between the last known price and the period specified
   * @param data Contains the date and prices for each weak for a product
   * @param period The period in months to calculate the difference
   * @returns The price difference between the last price and the period specified
   */
  getPriceDiff(data: { date: Date; price: number }[], period: number): number {
    const weeksInPeriod = period * 4; // Approximate 4 weeks per month
    const targetIndex = Math.max(0, data.length - 1 - weeksInPeriod);

    return data[data.length - 1].price - data[targetIndex].price;
  }

  async getProductById(id: string) {
    const product = await ProductModel.findById(id);

    if (!product) {
      return;
    }

    const firstPrice = product.prices[0].price;
    const lastPrice = product.prices[product.prices.length - 1].price;
    const currentYear = new Date().getFullYear();
    const currentYearPrices = product.prices.filter(priceEntry => {
      return new Date(priceEntry.date).getFullYear() === currentYear;
    });

    let signedImageUrl = null;
    if (product.image) {
      try {
        signedImageUrl = await S3Service.getSignedUrl(product.image);
      } catch (err) {
        logger.error(`Failed to generate signed image url for product: ${err}`);
        signedImageUrl = null;
      }
    }

    return {
      id: product._id,
      name: product.name,
      sector: product.sector,
      prices: product.prices.map(({ date, price }) => ({ date, price })),
      image: signedImageUrl,
      priceChange: {
        one_month: this.getPriceDiff(product.prices, 1),
        six_month: this.getPriceDiff(product.prices, 6),
        one_year: this.getPriceDiff(product.prices, 12),
        all: ((lastPrice - firstPrice) / firstPrice) * 100,
        ytd:
          currentYearPrices.length > 0
            ? ((currentYearPrices[currentYearPrices.length - 1].price - firstPrice) / firstPrice) *
              100
            : 0,
      },
    };
  }

  /**
   * Refreshes signed URLs for product images
   * @param productIds Array of product IDs to refresh images for
   * @returns Object containing product IDs mapped to their signed image URLs
   */
  async refreshProductImages(productIds: string[]): Promise<Record<string, string>> {
    const images: Record<string, string> = {};

    await Promise.all(
      productIds.map(async (productId: string) => {
        const product = await ProductModel.findById(productId);
        if (product?.image) {
          images[productId] = await S3Service.getSignedUrl(product.image);
        }
      }),
    );

    return images;
  }

  /**
   * Uploads and processes a product image
   * @param productId - The ID of the product
   * @param file - The image file to upload
   * @returns The S3 key of the uploaded image
   */
  async uploadProductImage(productId: string, file: Express.Multer.File): Promise<string> {
    try {
      logger.info(`Uploading image for product: ${productId}`);

      // Process image using centralized method
      const processedImageBuffer = await S3Service.processImage(file.buffer);

      const key = S3Service.generateProductImageKey(productId, 'jpg');
      const s3Key = await S3Service.uploadFile(processedImageBuffer, key, 'image/jpeg');

      const product = await ProductModel.findByIdAndUpdate(
        productId,
        { image: s3Key },
        { new: true },
      );

      if (!product) {
        logger.warn(`Product not found: ${productId}`);
        throw new Error('Product not found');
      }

      logger.info(`Image successfully uploaded for product: ${productId}`);
      return s3Key;
    } catch (error) {
      logger.error(`Error uploading product image: ${error}`);
      throw error;
    }
  }
}

export default new ProductService();
