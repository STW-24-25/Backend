import { Router } from 'express';
import userRoutes from './user.routes';
import parcelRoutes from './parcel.routes';
import forumRoutes from './forum.routes';
import productRoutes from './product.routes';
import statsRoutes from './stats.routes';
import messageRoutes from './message.routes';
import authRoutes from './auth.routes';
import notificationRoutes from './notification.routes';
import alertRoutes from './alert.routes';

const router = Router();

router.use('/users', userRoutes);
router.use('/auth', authRoutes);
router.use('/parcels', parcelRoutes);
router.use('/forums', forumRoutes);
router.use('/products', productRoutes);
router.use('/stats', statsRoutes);
router.use('/messages', messageRoutes);
router.use('/notifications', notificationRoutes);
router.use('/alerts', alertRoutes);

export default router;
