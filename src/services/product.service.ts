import ProductModel from '../models/product.model';

class ProductService {
  async getProductsByName(name: string, pageNumber: number, pageSize: number) {
    const filter: any = {};
    if (name) filter.name = { $regex: name, $options: 'i' };

    const products = await ProductModel.find(filter)
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .lean();

    const productsWithLastPrice = products.map(product => {
      const lastPrice = product.prices[product.prices.length - 1].price;
      return {
        id: product._id,
        name: product.name,
        sector: product.sector,
        lastPrice,
        image: product.image,
      };
    });

    const totalProducts = await ProductModel.countDocuments(filter);
    return {
      products: productsWithLastPrice,
      page: pageNumber,
      pageSize,
      totalProducts,
      totalPages: Math.ceil(totalProducts / pageSize),
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

    return {
      id: product._id,
      name: product.name,
      sector: product.sector,
      prices: product.prices.map(({ date, price }) => ({ date, price })),
      priceChange: {
        one_month: this.getPriceDiff(product.prices, 1),
        six_month: this.getPriceDiff(product.prices, 6),
        one_year: this.getPriceDiff(product.prices, 12),
      },
    };
  }
}

export default new ProductService();
