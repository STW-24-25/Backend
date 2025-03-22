import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from './logger'

dotenv.config()

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGODB_URI is not defined in .env file');
  }
  mongoose.connect(process.env.MONGO_URI)
    .then(() => logger.info('Connected to MongoDB Atlas'))
    .catch(err => logger.error('MongoDB connection error: ', err));
}

export default connectDB;