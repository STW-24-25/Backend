import { Request, Response } from 'express';
import logger from '../utils/logger';
import ProductService from '../services/product.service';

/**
 * Returns all products and their last price in page _page_ with page
 * size _pageSize_ if _name_ is empty, otherwise just the ones that match _name_.
 * @param req Request object, contains _name_, _page_, _size_ in the query.
 * @param res Response object
 */
export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const { name, page, size } = req.query;
    const pageNumber = parseInt(page as string) || 1;
    const pageSize = parseInt(size as string) || 16;

    const data = await ProductService.getProductsByName(name as string, pageNumber, pageSize);

    res.status(200).json({ data });

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
