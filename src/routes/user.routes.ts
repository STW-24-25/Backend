import { Router } from 'express';
import { fetchExternalData } from '../controllers/user.controller';

const router = Router()

router.get('/', fetchExternalData);

export default router;