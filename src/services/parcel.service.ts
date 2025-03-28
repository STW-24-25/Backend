import mongoose from 'mongoose';
import { localizacion, consulta } from 'sigpac-client';
import ParcelModel from '../models/parcel.model';
import logger from '../utils/logger';
import axios from 'axios';

/**
 * Service class that handles parcel-related operations.
 * Includes operations against the database and external API calls to Sigpac.
 */
class ParcelService {
  /**
   * Creates a new parcel in the database.
   * @param parcelData - The parcel data to be saved
   * @returns The created parcel
   */
  async createParcel(parcelData: any) {
    try {
      const parcel = new ParcelModel(parcelData);
      return await parcel.save();
    } catch (error: any) {
      logger.error('Error creating parcel', error);
      throw new Error(`Failed to create parcel: ${error.message}`);
    }
  }

  /**
   * Retrieves parcel information from Sigpac API based on coordinates.
   * @param lng - Longitude coordinate
   * @param lat - Latitude coordinate
   * @returns Parcel information in GeoJSON format
   */
  async getParcelInfoFromSigpac(lng: number, lat: number) {
    try {
      // Get parcel localization data from Sigpac
      const parcelGeoJSON = await localizacion('parcela', { lng, lat });

      if (!parcelGeoJSON || !parcelGeoJSON.features || parcelGeoJSON.features.length === 0) {
        throw new Error('No parcel found at specified coordinates');
      }

      // Get declaration data which contains crop information
      const declarationData = await consulta('declaracion', { lng, lat });

      return {
        parcelGeoJSON,
        declarationData,
      };
    } catch (error: any) {
      logger.error('Error fetching parcel from Sigpac', error);
      throw new Error(`Failed to fetch parcel data from Sigpac: ${error.message}`);
    }
  }

  /**
   * Gets weather data for the specified coordinates.
   * @param lng - Longitude coordinate
   * @param lat - Latitude coordinate
   * @returns Current weather data for the location
   */
  async getWeatherData(lng: number, lat: number) {
    try {
      // This is a placeholder. In a real implementation, you would use a weather API
      // like OpenWeatherMap, AccuWeather, etc.
      const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
        params: {
          lat,
          lon: lng,
          units: 'metric',
          appid: process.env.WEATHER_API_KEY || 'YOUR_API_KEY', // Should be replaced with actual API key
        },
      });

      return response.data;
    } catch (error: any) {
      logger.error('Error fetching weather data', error);
      throw new Error(`Failed to fetch weather data: ${error.message}`);
    }
  }

  /**
   * Gets a parcel by user ID and coordinates.
   * If the parcel exists in the database, retrieves it.
   * If not, fetches data from Sigpac, saves it to the database, and returns it.
   *
   * @param userId - The ID of the user
   * @param lng - Longitude coordinate
   * @param lat - Latitude coordinate
   * @returns Parcel data with weather information
   */
  async getParcelByCoordinates(userId: string, lng: number, lat: number) {
    try {
      // Check if parcel already exists in database
      let parcel = await ParcelModel.findOne({
        user: new mongoose.Types.ObjectId(userId),
        'location.lat': { $gte: lat - 0.0001, $lte: lat + 0.0001 },
        'location.lng': { $gte: lng - 0.0001, $lte: lng + 0.0001 },
      });

      // If parcel doesn't exist, create it
      if (!parcel) {
        const sigpacData = await this.getParcelInfoFromSigpac(lng, lat);

        // Extract properties from Sigpac response
        const parcelFeature = sigpacData.parcelGeoJSON.features[0];
        const parcelProperties = parcelFeature.properties;
        const declarationProperties = sigpacData.declarationData;

        // Determine crop type based on declaration data
        let cropType = 'Otros'; // Default
        if (declarationProperties && declarationProperties.parc_producto) {
          // Map Sigpac crop codes to your application's crop types
          // This is a simplified example
          const cropMapping: any = {
            '5': 'Cereales', // Cebada
            '1': 'Cereales', // Trigo
            '4': 'Cereales', // Avena
            '6': 'Legumbres', // Leguminosas
            '12': 'Viñedos', // Viñedo
            '23': 'Olivares', // Olivar
            '33': 'Frutales', // Frutales
          };

          cropType = cropMapping[declarationProperties.parc_producto.split(' - ')[0]] || 'Otros';
        }

        // Determine parcel size based on area
        let parcelSize = 'Pequeña';
        const area = parcelProperties.area || 0;
        if (area > 100000) {
          // 10 hectares
          parcelSize = 'Grande';
        } else if (area > 20000) {
          // 2 hectares
          parcelSize = 'Mediana';
        }

        // Crear objeto de parcela con una estructura simple
        const newParcelData = {
          user: userId,
          size: parcelSize,
          crop: cropType,
          location: {
            lat,
            lng,
          },
          autonomousCommunity: this.mapSigpacProvinceToAutonomousCommunity(
            parcelProperties.provincia,
          ),
          geoJSON: parcelFeature.geometry,
          sigpacData: {
            provincia: parcelProperties.provincia,
            municipio: parcelProperties.municipio,
            poligono: parcelProperties.poligono,
            parcela: parcelProperties.parcela,
            area: parcelProperties.area,
            perimetro: parcelProperties.perimetro,
            declarationInfo: declarationProperties,
          },
        };

        parcel = await this.createParcel(newParcelData);
      }

      // Get current weather data
      const weatherData = await this.getWeatherData(lng, lat);

      // Combine parcel with weather data
      return {
        parcel,
        weather: {
          temperature: weatherData.main?.temp,
          humidity: weatherData.main?.humidity,
          windSpeed: weatherData.wind?.speed,
          description: weatherData.weather?.[0]?.description,
          icon: weatherData.weather?.[0]?.icon,
        },
      };
    } catch (error: any) {
      logger.error('Error getting parcel by coordinates', error);
      throw new Error(`Failed to get parcel: ${error.message}`);
    }
  }

  /**
   * Maps Sigpac province codes to autonomous community values.
   * @param province - Province code or name from Sigpac
   * @returns Autonomous community name
   */
  private mapSigpacProvinceToAutonomousCommunity(province: string): string {
    // Extract province code if in format "XX - Province Name"
    const provinceCode = province.includes(' - ') ? province.split(' - ')[0] : province;

    // Map based on province codes
    const provinceMap: { [key: string]: string } = {
      // Andalucía
      '4': 'Andalucía',
      '11': 'Andalucía',
      '14': 'Andalucía',
      '18': 'Andalucía',
      '21': 'Andalucía',
      '23': 'Andalucía',
      '29': 'Andalucía',
      '41': 'Andalucía',
      // Aragón
      '22': 'Aragón',
      '44': 'Aragón',
      '50': 'Aragón',
      // Asturias
      '33': 'Principado de Asturias',
      // Baleares
      '7': 'Illes Balears',
      // Canarias
      '35': 'Canarias',
      '38': 'Canarias',
      // Cantabria
      '39': 'Cantabria',
      // Castilla-La Mancha
      '2': 'Castilla-La Mancha',
      '13': 'Castilla-La Mancha',
      '16': 'Castilla-La Mancha',
      '19': 'Castilla-La Mancha',
      '45': 'Castilla-La Mancha',
      // Castilla y León
      '5': 'Castilla y León',
      '9': 'Castilla y León',
      '24': 'Castilla y León',
      '34': 'Castilla y León',
      '37': 'Castilla y León',
      '40': 'Castilla y León',
      '42': 'Castilla y León',
      '47': 'Castilla y León',
      '49': 'Castilla y León',
      // Cataluña
      '8': 'Cataluña',
      '17': 'Cataluña',
      '25': 'Cataluña',
      '43': 'Cataluña',
      // Extremadura
      '6': 'Extremadura',
      '10': 'Extremadura',
      // Galicia
      '15': 'Galicia',
      '27': 'Galicia',
      '32': 'Galicia',
      '36': 'Galicia',
      // Madrid
      '28': 'Comunidad de Madrid',
      // Murcia
      '30': 'Región de Murcia',
      // Navarra
      '31': 'Comunidad Foral de Navarra',
      // País Vasco
      '1': 'País Vasco',
      '20': 'País Vasco',
      '48': 'País Vasco',
      // La Rioja
      '26': 'La Rioja',
      // Comunitat Valenciana
      '3': 'Comunitat Valenciana',
      '12': 'Comunitat Valenciana',
      '46': 'Comunitat Valenciana',
      // Ciudades autónomas
      '51': 'Ciudad Autónoma de Ceuta',
      '52': 'Ciudad Autónoma de Melilla',
    };

    return provinceMap[provinceCode] || 'Aragón'; // Default to Aragón if not found
  }
}

export default new ParcelService();
