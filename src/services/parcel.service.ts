import ParcelModel, { IParcel } from '../models/parcel.model';
import ProductModel from '../models/product.model';
import logger from '../utils/logger';
import { Aemet } from 'aemet-api';
import { CAPITAL_NAMES } from './constants/location.constants';
import UserModel from '../models/user.model';
import userService from './user.service';
import { pointOnFeature } from '@turf/point-on-feature';
import axios from 'axios';
import {
  getGeoJSONSigpacUrl,
  getMunicSigpacUrl,
  USO_SIGPAC_URL,
  VALID_SIGPAC_USES,
} from './constants/sigpac.constants';

const aemetClient = new Aemet(process.env.AEMET_API_KEY as string);

/**
 * Service class that handles parcel-related operations.
 * Includes operations against the database and external API calls to Sigpac.
 */
class ParcelService {
  private municipalitiesCache: { [key: number]: { [key: string]: string } } = {};

  /**
   * Formatea un nombre para tener la primera letra en mayúscula y el resto en minúsculas
   * @param name - Nombre a formatear
   * @returns Nombre formateado
   */
  private formatName(name: string): string {
    return name.toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase());
  }

  /**
   * Creates a new parcel in the database.
   * @param parcelData - The parcel data to be saved
   * @returns The created parcel
   */
  async createParcel(userId: string, parcelData: any) {
    try {
      const parcelInfo = await this.getParcelGeoJSON(
        Number(parcelData.location.lng),
        Number(parcelData.location.lat),
      );

      const parcelToCreate = { ...parcelInfo, crop: parcelData.crop };

      // Check the product ids given are valid
      if (parcelData.products.length > 0) {
        const productIds = parcelData.products.map((product: any) => product.id || product);

        const existingProducts = await ProductModel.find({
          _id: { $in: productIds },
        });

        if (existingProducts.length !== productIds.length) {
          throw new Error('One or more product IDs are invalid');
        }

        // Add validated products to parcel
        parcelToCreate.products = productIds;
      }

      // Save and update the user's array of parcels
      const parcel = new ParcelModel(parcelToCreate);
      const savedParcel = await parcel.save();
      await UserModel.findOneAndUpdate({ _id: userId }, { $push: { parcels: savedParcel._id } });

      return savedParcel;
    } catch (error: any) {
      logger.error('Error creating parcel', error);
      throw new Error(`Failed to create parcel: ${error.message}`);
    }
  }

  /**
   * Gets a parcel by coordinates, if the parcel is registered as owned by one of the users in
   * the platform, the owner, parcel data, geoJSON and weather data are returned; otherwise only
   * the geoJSON and weather data are returned. If the coordinates do not match a parcel in the system
   * or in SIGPAC, an error is thrown.
   *
   * @param userId - User ID
   * @param lng - Longitude coordinate
   * @param lat - Latitude coordinate
   * @returns Parcel data with weather information
   */
  async getParcelByCoordinates(userId: string, lng: number, lat: number) {
    try {
      logger.info(`Buscando parcela para usuario ${userId} en coordenadas [${lng}, ${lat}]`);

      let result;
      const user = await userService.getUserById(userId);

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Check for parcels registered at the location
      const parcel = await ParcelModel.findOne(
        {
          'geometry.features.geometry': {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [lng, lat],
              },
              $maxDistance: 1000, // 1 km radius
            },
          },
          'geometry.features': {
            $elemMatch: {
              'properties.name': 'pointOnFeature',
              'geometry.type': 'Point',
            },
          },
        },
        {
          'geometry.features._id': 0,
        },
      );

      // If it's registered return the owner together with the rest of the data
      if (parcel) {
        logger.info('Parcel registered');
        result = { parcel, owner: user };
      } else {
        // Parcel is not registered, get just the geoJSON from SIGPAC
        logger.info('Parcel not registered');
        const parcelData = await this.getParcelGeoJSON(lng, lat);
        result = { parcel: parcelData };
      }

      const weatherData = await this.getWeatherData(lng, lat);

      const weather = weatherData ? weatherData : 'Could not retrieve weather data from AEMET';

      return {
        ...result,
        weather,
      };
    } catch (error: any) {
      logger.error('Error al obtener parcela por coordenadas', error);
      throw new Error(`No se pudo obtener la parcela: ${error.message}`);
    }
  }

  /**
   * Obtiene solo el GeoJSON de una parcela desde SIGPAC
   * @param lng - Longitud
   * @param lat - Latitud
   * @returns GeoJSON de la parcela
   */
  private async getParcelGeoJSON(lng: number, lat: number) {
    try {
      const responseGeoJSON = await axios.get(getGeoJSONSigpacUrl(lng, lat), {
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate, br',
        },
      });

      const rawParcelGeoJSON = responseGeoJSON.data;

      if (
        !rawParcelGeoJSON ||
        !rawParcelGeoJSON.features ||
        rawParcelGeoJSON.features.length === 0
      ) {
        throw new Error('No parcel found at specified coordinates');
      }

      const { properties, ...polygon } = rawParcelGeoJSON.features[0];

      if (!this.validParcelUse(properties.uso_sigpac)) {
        throw new Error(`The parcel selected is not of valid use: ${properties.uso_sigpac}`);
      }
      const provinceCode = properties.provincia;
      const municipalityCode = Number(properties.municipio);
      const [{ provinceName, municipalityName }, parcelUse] = await Promise.all([
        this.getLocationInfo(provinceCode, municipalityCode),
        this.mapUsoSigpac(properties.uso_sigpac),
      ]);

      return {
        geometry: {
          type: 'FeatureCollection',
          features: [
            { ...polygon, properties: { name: 'polygon' } },
            { ...pointOnFeature(polygon), properties: { name: 'pointOnFeature' } },
          ],
        },
        products: [],
        provinceCode,
        provinceName,
        municipalityCode,
        municipalityName,
        parcelUse,
        coefRegadio: properties.coef_regadio || 0,
        altitude: properties.altitud || 0,
        surface: properties.dn_surface / 10000 || 0,
      };
    } catch (error: any) {
      logger.error('Error fetching GeoJSON from Sigpac', error);
      throw new Error(`Failed to fetch GeoJSON from Sigpac: ${error.message}`);
    }
  }

  private validParcelUse(parcelUseCode: string) {
    return VALID_SIGPAC_USES.includes(parcelUseCode);
  }

  private async mapUsoSigpac(code: string): Promise<string> {
    try {
      // If the map is empty, fetch the usage codes
      const response = await axios.get(USO_SIGPAC_URL, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (response.status !== 200 && response.status !== 304) {
        throw new Error('No response from Sigpac');
      }

      const match = response.data.codigos.find((item: { codigo: string }) => item.codigo === code);
      if (match) {
        return match.descripcion;
      }

      // Return the original code if no match was found
      return code;
    } catch (error: any) {
      logger.error('Error mapping SIGPAC usage code', error);
      throw new Error(`Error mapping SIGPAC usage code: ${error.message}`);
    }
  }

  /**
   * Obtiene los datos de provincia y municipio basados en los códigos
   * @param provinceCode - Código de provincia
   * @param municipalityCode - Código de municipio
   * @returns Información formateada de provincia y municipio
   */
  private async getLocationInfo(provinceCode: number, municipalityCode: number) {
    try {
      // Get province name and ensure it exists
      const provinceName = CAPITAL_NAMES[provinceCode];
      if (!provinceName) {
        throw new Error(`Province code ${provinceCode} not found in capital names`);
      }

      // Get municipality name from cached data or fetch it
      if (!this.municipalitiesCache[provinceCode]) {
        const municResponse = await axios.get(getMunicSigpacUrl(provinceCode), {
          headers: {
            Accept: 'application/json',
          },
        });
        const municipalityData = municResponse.data;

        // Convert the array format to our cache format
        this.municipalitiesCache[provinceCode] = {};
        if (municipalityData.codigos && Array.isArray(municipalityData.codigos)) {
          municipalityData.codigos.forEach((item: { codigo: number; descripcion: string }) => {
            this.municipalitiesCache[provinceCode][item.codigo] = item.descripcion;
          });
        }
      }

      const municipalityName = this.formatName(
        this.municipalitiesCache[provinceCode][municipalityCode],
      );
      const formattedProvinceName = this.formatName(provinceName);

      return {
        provinceName: formattedProvinceName,
        municipalityName,
      };
    } catch (error: any) {
      logger.error('Error getting location info', error);
      throw new Error(`Failed to get location info: ${error.message}`);
    }
  }

  /**
   * Gets weather data for the specified coordinates.
   * @param lng - Longitude coordinate
   * @param lat - Latitude coordinate
   * @param provinceName - Name of the province
   * @returns Current weather data for the location
   */
  private async getWeatherData(lng: number, lat: number) {
    try {
      const weatherResponse = await aemetClient.getWeatherByCoordinates(lat, lng);
      logger.info('Retrieved data from AEMET');
      logger.debug('AEMET RESPONSE', weatherResponse);

      return {
        main: {
          temperature: weatherResponse.weatherData.temperatura,
          windChillFactor: weatherResponse.weatherData.sensTermica,
          relativeHumidity: weatherResponse.weatherData.humedadRelativa,
          skyState: weatherResponse.weatherData.estadoCielo.descripcion,
        },
        wind: {
          speed: weatherResponse.weatherData.viento.velocidad,
          gust: weatherResponse.weatherData.viento.rachaMax,
          direction: weatherResponse.weatherData.viento.direccion,
        },
        precipitation: {
          rain: weatherResponse.weatherData.precipitacion,
          rainChance: weatherResponse.weatherData.probPrecipitacion,
          snow: weatherResponse.weatherData.nieve,
          snowChance: weatherResponse.weatherData.probNieve,
          stormChance: weatherResponse.weatherData.probTormenta,
        },
        date: weatherResponse.weatherData.fecha,
        hour: parseInt(weatherResponse.weatherData.periodo),
        distance: weatherResponse.distancia,
        municipality: weatherResponse.name,
      };
    } catch (error: any) {
      logger.error('Error retrieving data from AEMET', {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Gets all parcels basic information for a user
   * @param userId - User ID
   * @returns Array of parcels
   */
  async getAllParcels(userId: string) {
    try {
      const user = await UserModel.findOne({ _id: userId }).populate('parcels').lean();

      if (!user) {
        throw new Error('User not found');
      }

      return user.parcels as unknown as IParcel[];
    } catch (error: any) {
      logger.error('Error getting all parcels', error);
      throw new Error(`Failed to get all parcels: ${error.message}`);
    }
  }
}

export default new ParcelService();
