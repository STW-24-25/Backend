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

    const products = await ProductModel.find(filter)
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .lean();

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

/**
 * Calculates the price difference between the last known price and the period specified
 * @param data Contains the date and prices for each weak for a product
 * @param period The period in months to calculate the difference
 * @returns The price difference between the last price and the period specified
 */
const getPriceDiff = (data: { date: Date; price: number }[], period: number): number => {
  const weeksInPeriod = period * 4; // Approximate 4 weeks per month
  const targetIndex = Math.max(0, data.length - 1 - weeksInPeriod);

  return data[data.length - 1].price - data[targetIndex].price;
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    const product = await ProductModel.findById(id);

    if (!product) {
      res.status(404).json({ message: `Product ${id} not found` });
      return;
    }

    res.status(200).json({
      id: product._id,
      name: product.name,
      sector: product.sector,
      prices: product.prices.map(({ date, price }) => ({ date, price })),
      priceChange: {
        one_month: getPriceDiff(product.prices, 1),
        six_month: getPriceDiff(product.prices, 6),
        one_year: getPriceDiff(product.prices, 12),
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving product by id', err });
    logger.error('Error retrieving product by id ', err);
  }
};
