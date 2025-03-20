import express from 'express';
import cors = require('cors');
import userRouter from './routes/user.routes';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/', userRouter)


export default app;