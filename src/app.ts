import dotenv from 'dotenv';

dotenv.config();

import express from 'express';
import cors = require('cors');
import router from './routes';
import { swaggerOptions } from './utils/swagger';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import zodErorrHandler from './utils/error.handlers/zod.error.handler';
import { configurarJobs } from './jobs/jobs.config';
import path from 'path';
const app = express();

const swaggerSpec = swaggerJSDoc(swaggerOptions);

app.use('/swagger_css', express.static(path.join(__dirname, '../swagger_css')));
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, { customCssUrl: '/swagger_css/theme.css' }),
);

app.get('/api/docs/json', (_req, res): void => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Configuración más específica de CORS
const corsOptions = {
  origin: ['*'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  maxAge: 86400, // 24 horas en segundos
};

app.use(cors(corsOptions));
app.use(express.json());
app.use('/api', router);

// Configurar jobs programados
configurarJobs();

app.use(zodErorrHandler);

export default app;
