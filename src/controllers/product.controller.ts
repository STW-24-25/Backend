import { Request, Response } from 'express';
import ProductModel from '../models/product.model';
import logger from '../utils/logger';

/**
 * Returns all products and their last price in page _page_ with page
 * size _pageSize_ if _name_ is empty, otherwise just the ones that match _name_.
 * @param req Request object, contains _name_, _page_, _size_ in the query.
 * @param res Response object
 */
export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const { name, page, size } = req.query;

    const filter: any = {};
    if (name) filter.name = { $regex: name, $options: 'i' };

    const pageNumber = parseInt(page as string) || 1;
    const pageSize = parseInt(size as string) || 16;
    const skip = (pageNumber - 1) * pageSize;

    const products = await ProductModel.find(filter).skip(skip).limit(pageSize).lean();

    const productsWithLastPrice = products.map(product => {
      const lastPrice = product.prices[product.prices.length - 1].price;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { prices, ...rest } = product; // remove the prices array
      return {
        ...rest,
        lastPrice,
      };
    });

    const totalProducts = await ProductModel.countDocuments(filter);

    res.status(200).json({
      products: productsWithLastPrice,
      page: pageNumber,
      pageSize,
      totalProducts,
      totalPages: Math.ceil(totalProducts / pageSize),
    });

    logger.info(`Retrieved products (page ${pageNumber}, size ${pageSize})`);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving products', err });
    logger.error('Error retrieving products', err);
  }
};

export const getProduct = async (req: Request, res: Response) => {
  res.status(501).json({ message: 'getProduct not implemented yet' });
};
