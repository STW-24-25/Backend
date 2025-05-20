import { Request, Response } from 'express';
import parcelService from '../services/parcel.service';
import logger from '../utils/logger';

/**
 * Gets parcel information based on coordinates.
 * @param req Request object containing user ID from authentication and coordinates.
 * @param res Response object, will have 200 with parcel data if found, 404 if not found, or 500 if an error occurred.
 * @returns Promise<void>
 */
export const getParcel = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get user ID from headers
    const userId = req.auth.id;

    // Get coordinates from query parameters
    const lng = parseFloat(req.query.lng as string);
    const lat = parseFloat(req.query.lat as string);

    // Validate coordinates
    if (isNaN(lng) || isNaN(lat)) {
      res.status(400).json({ message: 'Valid longitude and latitude coordinates are required' });
      return;
    }

    // Call service to get parcel data
    const parcelData = await parcelService.getParcelByCoordinates(userId, lng, lat);

    // Return the parcel data
    res.status(200).json(parcelData);
    logger.info(`Parcel retrieved for user ${userId} at coordinates (${lng}, ${lat})`);
  } catch (error: any) {
    if (error.message.includes('No parcel found')) {
      res.status(404).json({ message: 'No parcel found at the specified coordinates' });
      return;
    }

    res.status(500).json({ message: 'Error retrieving parcel', error: error.message });
    logger.error('Error retrieving parcel', error);
  }
};

/**
 * Creates a parcel for a user.
 * @param req Request object containing parcel data.
 * @param res Response object, will have 201 if created, 400 if invalid data, or 500 if an error occurred.
 * @returns Promise<void>
 */
export const createParcel = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.auth.id;

    const parcel = await parcelService.createParcel(userId, req.body);

    res.status(201).json({ message: 'Parcel created successfully', parcel });
    logger.info(`Parcel created for user ${userId}`);
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating parcel', error: error.message });
    logger.error('Error creating parcel', error);
  }
};

/**
 * Gets all parcels for a given user.
 * @param req Request object containing parcel ID and data to update.
 * @param res Response object, will have 200 if updated, 400 if invalid data, or 500 if an error occurred.
 * @returns Promise<void>
 */

export const getParcels = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get user ID from headers
    const userId = req.auth.id;

    // Get parcels for the user
    const parcels = await parcelService.getAllParcels(userId);

    res.status(200).json(parcels);
    logger.info(`Parcels retrieved for user ${userId}`);
  } catch (err: any) {
    res.status(500).json({ message: 'Error retrieving parcels', error: err.message });
    logger.error('Error retrieving parcels', err);
  }
};
