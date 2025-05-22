import mongoose from 'mongoose';
import logger from './logger';

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not defined in .env file');
  }

  // Configuración de opciones para la conexión a MongoDB
  const mongooseOptions = {
    serverSelectionTimeoutMS: 15000, // Tiempo de espera para seleccionar un servidor (15 segundos)
    socketTimeoutMS: 45000, // Tiempo de espera para operaciones de socket (45 segundos)
    connectTimeoutMS: 30000, // Tiempo de espera para la conexión inicial (30 segundos)
    maxPoolSize: 10, // Máximo número de conexiones en el pool
    minPoolSize: 3, // Mínimo número de conexiones en el pool
    maxIdleTimeMS: 60000, // Tiempo máximo que una conexión puede estar inactiva antes de ser cerrada (60 segundos)
  };

  mongoose
    .connect(process.env.MONGO_URI, mongooseOptions)
    .then(() => logger.info('Connected to MongoDB Atlas'))
    .catch(err => logger.error('MongoDB connection error: ', err));
};

export default connectDB;
