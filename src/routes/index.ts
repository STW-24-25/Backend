import { Router } from 'express';
import userRoutes from './user.routes';
import parcelRoutes from './parcel.routes';
import forumRoutes from './forum.routes';
import productRoutes from './product.routes';
import statsRoutes from './stats.routes';

const router = Router();

router.use('/users', userRoutes);
router.use('/parcels', parcelRoutes);
router.use('/forum', forumRoutes);
router.use('/product', productRoutes);
router.use('/stats', statsRoutes);

export default router;
