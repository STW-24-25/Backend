import express from 'express';
import cors = require('cors');
import userRouter from './routes/user.routes';
import { swaggerOptions } from './utils/swagger';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import zodErorrHandler from './utils/error.handlers/zod.error.handler';


const app = express();

const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs.json', (_req, res): void => {
  res.setHeader('Content-Type', 'application/json')
  res.send(swaggerSpec)
})

app.use(cors());
app.use(express.json());

app.use('/api/users', userRouter)


app.use(zodErorrHandler);

export default app;