import { Router } from 'express';
import * as productCont from '../controllers/product.controller';
import { validateSchema } from '../middleware/validator';

const router = Router();

// #### PUBLIC ####

// todo swagger
router.get('/', productCont.getAllProducts);

// todo swagger
router.get('/{id}', productCont.getProduct);

export default router;