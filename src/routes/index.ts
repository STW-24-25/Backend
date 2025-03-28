import { Router } from 'express';
import userRoutes from './user.routes';
import parcelRoutes from './parcel.routes';
// Import other route files as needed

const router = Router();

// Mount routes
router.use('/users', userRoutes);
router.use('/parcels', parcelRoutes);
// Use other routes as needed

export default router;
