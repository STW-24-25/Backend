import { Request, Response } from 'express';
import logger from '../utils/logger';
import ProductService from '../services/product.service';
import S3Service from '../services/s3.service';
import ProductModel from '../models/product.model';

/**
 * Returns all products and their last price in page _page_ with page
 * size _pageSize_ if _name_ is empty, otherwise just the ones that match _name_.
 * @param req Request object, contains _name_, _page_, _size_ in the query.
 * @param res Response object
 */
export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const { name, page, size } = req.query;
    const pageNumber = parseInt(page as string);
    const pageSize = parseInt(size as string);

    const data = await ProductService.getProductsByName(name as string, pageNumber, pageSize);

    res.status(200).json(data);

    logger.info(`Retrieved products (page ${pageNumber}, size ${pageSize})`);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving products', err });
    logger.error('Error retrieving products', err);
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    const data = await ProductService.getProductById(id);

    if (!data) {
      res.status(404).json({ message: `Product ${id} not found` });
      return;
    }

    res.status(200).json({ data });
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving product by id', err });
    logger.error('Error retrieving product by id ', err);
  }
};

/**
 * Uploads a product image to S3 and updates the product in the database
 * @param req - Express request object
 * @param res - Express response object
 */
export const uploadProductImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const productId = req.params.id;
    const file = req.file;

    if (!file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const imageUrl = await ProductService.uploadProductImage(productId, file);
    res.json({ message: 'Product image uploaded successfully', imageUrl });
  } catch (error) {
    logger.error('Error uploading product image:', error);
    res.status(500).json({ message: 'Error uploading product image' });
  }
};

/**
 * Deletes a product's image from S3 and updates the product in the database
 * @param req - Express request object
 * @param res - Express response object
 */
export const deleteProductImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const productId = req.params.id;
    const product = await ProductModel.findById(productId);

    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    if (!product.image) {
      res.status(400).json({ message: 'No product image to delete' });
      return;
    }

    await S3Service.deleteFile(product.image);
    await ProductModel.findByIdAndUpdate(productId, { $unset: { image: 1 } });

    res.json({ message: 'Product image deleted successfully' });
  } catch (error) {
    logger.error('Error deleting product image:', error);
    res.status(500).json({ message: 'Error deleting product image' });
  }
};

/**
 * Refreshes signed URLs for product images
 * @param req Request object containing product IDs to refresh
 * @param res Response object, will have 200 with refreshed image URLs or 500 if an error occurred
 * @returns Promise<void>
 */
export const refreshProductImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productIds } = req.body;
    const images = await ProductService.refreshProductImages(productIds);
    res.json({ images });
  } catch (error) {
    logger.error('Error refreshing product images:', error);
    res.status(500).json({ message: 'Error refreshing images' });
  }
};
