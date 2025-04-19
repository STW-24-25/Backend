import mongoose from 'mongoose';
import ParcelModel from '../models/parcel.model';
import ProductModel from '../models/product.model';
import logger from '../utils/logger';
import dotenv from 'dotenv';
import { Aemet } from 'aemet-api';
import { CAPITAL_NAMES } from './constants/location.constants';

// Load environment variables
dotenv.config();

// Initialize AEMET client with API key from .env
const aemetClient = new Aemet(
  process.env.AEMET_API_KEY ||
    'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI4NDg0ODFAdW5pemFyLmVzIiwianRpIjoiOTZkNjQ1YmItZDAwYi00ZmQ5LWFkMmEtYjg4OTQ2NmFkMzYwIiwiaXNzIjoiQUVNRVQiLCJpYXQiOjE3NDQ4MjExMzUsInVzZXJJZCI6Ijk2ZDY0NWJiLWQwMGItNGZkOS1hZDJhLWI4ODk0NjZhZDM2MCIsInJvbGUiOiIifQ.xdtMRcilXabDMIrC8rjxPqY-5M6S3q2sID0YMs-Z360',
);

/**
 * Service class that handles parcel-related operations.
 * Includes operations against the database and external API calls to Sigpac.
 */
class ParcelService {
  private municipalitiesCache: { [key: string]: string } = {};

  /**
   * Creates a new parcel in the database.
   * @param parcelData - The parcel data to be saved
   * @returns The created parcel
   */
  async createParcel(parcelData: any) {
    try {
      // Convert location format from {lat, lng} to GeoJSON Point
      const parcelToCreate = {
        ...parcelData,
        location: {
          type: 'Point',
          coordinates: [
            Number(parcelData.location.lng), // Asegurar que se mantenga el signo usando Number()
            Number(parcelData.location.lat),
          ],
        },
      };

      // Remove original lat/lng properties if they exist at root level
      if (parcelToCreate.lat) delete parcelToCreate.lat;
      if (parcelToCreate.lng) delete parcelToCreate.lng;

      // Si se han proporcionado productos, buscarlos por nombre en la BD
      if (parcelData.products && Array.isArray(parcelData.products)) {
        // Buscar los productos por nombre
        const existingProducts = await ProductModel.find({
          name: { $in: parcelData.products },
        });

        if (existingProducts.length !== parcelData.products.length) {
          const foundProductNames = existingProducts.map(p => p.name);
          const missingProducts = parcelData.products.filter(
            (name: string) => !foundProductNames.includes(name),
          );
          throw new Error(
            `Los siguientes productos no existen en la base de datos: ${missingProducts.join(', ')}`,
          );
        }

        // Asignar los IDs de los productos encontrados
        parcelToCreate.products = existingProducts.map(product => product._id);
      } else {
        parcelToCreate.products = []; // Si no hay productos, inicializar como array vacío
      }

      const parcel = new ParcelModel(parcelToCreate);

      // Verificar que las coordenadas mantienen su signo antes de guardar
      if (parcelData.location.lng < 0 && parcel.location.coordinates[0] > 0) {
        parcel.location.coordinates[0] = -parcel.location.coordinates[0];
      }
      if (parcelData.location.lat < 0 && parcel.location.coordinates[1] > 0) {
        parcel.location.coordinates[1] = -parcel.location.coordinates[1];
      }

      const savedParcel = await parcel.save();

      // Actualizar el array de parcelas del usuario
      await mongoose
        .model('User')
        .findByIdAndUpdate(parcelData.user, { $push: { parcels: savedParcel._id } });

      return savedParcel;
    } catch (error: any) {
      logger.error('Error creating parcel', error);
      throw new Error(`Failed to create parcel: ${error.message}`);
    }
  }

  /**
   * Gets a parcel by coordinates.
   * If the parcel exists in the database, retrieves it.
   * If not, throws an error.
   *
   * @param userId - User ID
   * @param lng - Longitude coordinate
   * @param lat - Latitude coordinate
   * @returns Parcel data with weather information
   */
  async getParcelByCoordinates(userId: string, lng: number, lat: number) {
    try {
      logger.info(`Buscando parcela para usuario ${userId} en coordenadas [${lng}, ${lat}]`);

      // Primero obtener el usuario con sus parcelas
      const user = await mongoose.model('User').findById(userId).populate('parcels');

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Si el usuario tiene parcelas, buscar primero en ellas
      if (user.parcels && user.parcels.length > 0) {
        const parcel = user.parcels.find((p: { location: { coordinates: number[] } }) => {
          const [parcelLng, parcelLat] = p.location.coordinates;
          const distance = this.calculateDistance(lat, lng, parcelLat, parcelLng);
          return distance <= 1; // 1 km de distancia máxima
        });

        if (parcel) {
          logger.info(
            `Parcela encontrada en el array de parcelas del usuario: [${parcel.location.coordinates}]`,
          );

          // Obtener datos de SIGPAC una sola vez
          const sigpacData = await this.getParcelInfoFromSigpac(lng, lat);

          // Extract only the names from municipio and provincia
          const municipioFormatted = sigpacData.declarationData.municipio.split(' - ')[1] || '';
          const provinciaFormatted = sigpacData.declarationData.provincia.split(' - ')[1] || '';

          // Usar los datos de SIGPAC para obtener el tiempo
          const weatherData = await this.getWeatherData(lng, lat, sigpacData);

          return {
            parcel: {
              geoJSON: sigpacData.parcelGeoJSON,
              products: parcel.products,
              createdAt: parcel.createdAt,
              municipio: municipioFormatted,
              provincia: provinciaFormatted.toLowerCase(),
              superficie: sigpacData.declarationData.superficie,
            },
            weather: {
              main: {
                temp: weatherData.main.temp,
                humidity: weatherData.main.humidity,
                temp_max: weatherData.main.temp_max,
                temp_min: weatherData.main.temp_min,
                pressure_max: weatherData.main.pressure_max,
                pressure_min: weatherData.main.pressure_min,
              },
              wind: {
                speed: weatherData.wind.speed,
                gust: weatherData.wind.gust,
                direction: weatherData.wind.direction,
              },
              precipitation: {
                rain: weatherData.precipitation.rain,
                snow: weatherData.precipitation.snow,
              },
              solar: {
                radiation: weatherData.solar.radiation,
              },
              description: weatherData.weather[0].description,
              icon: weatherData.weather[0].icon,
              date: weatherData.date,
              time_max_temp: weatherData.time_max_temp,
              time_min_temp: weatherData.time_min_temp,
            },
          };
        }
      }

      // Si no se encuentra en el array de parcelas del usuario, lanzar error
      throw new Error('No se encontró la parcela en las coordenadas especificadas');
    } catch (error: any) {
      logger.error('Error al obtener parcela por coordenadas', error);
      throw new Error(`No se pudo obtener la parcela: ${error.message}`);
    }
  }

  /**
   * Retrieves parcel information from Sigpac API based on coordinates.
   * @param lng - Longitude coordinate
   * @param lat - Latitude coordinate
   * @returns Parcel information with geojson and declaration data
   */
  private async getParcelInfoFromSigpac(lng: number, lat: number) {
    try {
      // Get parcel GeoJSON using direct fetch
      const responseGeoJSON = await fetch(
        `https://sigpac-hubcloud.es/servicioconsultassigpac/query/recinfobypoint/4258/${lng}/${lat}.geojson`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Accept: 'application/json',
          },
        },
      );

      const rawParcelGeoJSON = await responseGeoJSON.json();
      logger.info('Raw Parcel GeoJSON data retrieved from Sigpac:', rawParcelGeoJSON);

      if (
        !rawParcelGeoJSON ||
        !rawParcelGeoJSON.features ||
        rawParcelGeoJSON.features.length === 0
      ) {
        throw new Error('No parcel found at specified coordinates');
      }

      // Extract province code from GeoJSON before removing properties
      const provinceCode = rawParcelGeoJSON.features[0].properties.provincia;
      const municipalityCode = rawParcelGeoJSON.features[0].properties.municipio;

      // Create a clean version of the GeoJSON without properties and crs
      const parcelGeoJSON = {
        type: rawParcelGeoJSON.type,
        features: rawParcelGeoJSON.features.map((feature: { type: string; geometry: any }) => ({
          type: feature.type,
          geometry: feature.geometry,
        })),
      };

      // Get declaration data from new SIGPAC endpoint
      const responseDeclaration = await fetch(
        `https://sigpac.mapama.gob.es/fega/serviciosvisorsigpac/query/infodeclaracion/${lng}/${lat}`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Accept: 'application/json',
          },
        },
      );

      let declarationData;
      try {
        const rawDeclarationData = await responseDeclaration.json();
        logger.info('Declaration data retrieved from Sigpac:', responseDeclaration);

        // Map province code to name
        const provinceName = `${provinceCode} - ${CAPITAL_NAMES[provinceCode] || ''}`;

        declarationData = {
          provincia: provinceName, // Format: "19 - GUADALAJARA"
          municipio: `${municipalityCode} - ${rawDeclarationData?.features?.[0]?.properties?.municipio || ''}`,
          superficie:
            this.convertToHectares(rawDeclarationData?.features?.[0]?.properties?.parc_supcult) ||
            0,
          cultivo: rawDeclarationData?.features?.[0]?.properties?.parc_producto || '',
          ayudas: rawDeclarationData?.features?.[0]?.properties?.parc_ayu_desc || [],
        };
      } catch (error) {
        logger.error('Error parsing declaration data:', error);
        // Provide fallback data using GeoJSON information
        declarationData = {
          provincia: `${provinceCode} - ${CAPITAL_NAMES[provinceCode] || ''}`,
          municipio: `${municipalityCode} - `,
          superficie: 0,
          cultivo: '',
          ayudas: [],
        };
      }

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
   * Converts surface area from square meters to hectares
   * @param surfaceInSqMeters - Surface area in square meters
   * @returns Surface area in hectares
   */
  private convertToHectares(surfaceInSqMeters: number): number {
    if (!surfaceInSqMeters) return 0;
    return Number((surfaceInSqMeters / 10000).toFixed(4)); // 1 hectare = 10000 square meters
  }

  /**
   * Calcula la humedad relativa aproximada basada en la temperatura y presión
   * @param temp - Temperatura en grados Celsius
   * @param pres - Presión atmosférica en hPa
   * @returns Humedad relativa estimada en porcentaje
   */
  private calculateHumidity(temp: number, pres: number): number {
    // Fórmula simplificada para estimar humedad relativa
    // Basada en la relación entre temperatura, presión y humedad
    const baseHumidity = 50; // Humedad base
    const tempFactor = (temp - 20) / 10; // Factor de temperatura
    const presFactor = (pres - 1013) / 100; // Factor de presión

    // Ajustamos la humedad base según los factores
    let humidity = baseHumidity + tempFactor * -5 + presFactor * 2;

    // Aseguramos que la humedad esté entre 0 y 100
    humidity = Math.max(0, Math.min(100, humidity));

    return Math.round(humidity);
  }

  /**
   * Gets weather data for the specified coordinates.
   * @param lng - Longitude coordinate
   * @param lat - Latitude coordinate
   * @param sigpacData - Data from SIGPAC
   * @returns Current weather data for the location
   */
  private async getWeatherData(lng: number, lat: number, sigpacData: any) {
    try {
      // Validar que tenemos los datos de declaración de SIGPAC
      if (!sigpacData?.declarationData?.provincia) {
        logger.error(
          'No se encontró información de provincia en los datos de declaración de SIGPAC:',
          sigpacData,
        );
        return this.getDefaultWeatherData();
      }

      logger.info('Datos de declaración de SIGPAC recibidos:', sigpacData.declarationData);

      // Get province code and name from declaration data
      let provinceCode, provinceName;

      if (sigpacData.declarationData.provincia.includes(' - ')) {
        // Format: "19 - GUADALAJARA"
        [provinceCode, provinceName] = sigpacData.declarationData.provincia.split(' - ');
      } else {
        // Format: "GUADALAJARA"
        provinceName = sigpacData.declarationData.provincia;
        // Buscar el código de provincia basado en el nombre
        for (const [code, name] of Object.entries(CAPITAL_NAMES)) {
          if (name.toLowerCase() === provinceName.toLowerCase()) {
            provinceCode = code;
            break;
          }
        }
      }

      logger.info('Código de provincia:', provinceCode);

      if (!provinceName) {
        logger.error('No se encontró el nombre de la provincia en los datos de declaración');
        return this.getDefaultWeatherData();
      }

      logger.info('Nombre de provincia:', provinceName);

      // Get weather data using AEMET method
      const weatherResponse = await aemetClient.getWeatherByCoordinates(lat, lng, provinceName);
      logger.info('Respuesta de AEMET:', weatherResponse);

      // Map the response to our expected format
      return {
        main: {
          temp: weatherResponse?.weatherData?.tm || 22.3,
          humidity: this.calculateHumidity(
            weatherResponse?.weatherData?.tm || 22.3,
            weatherResponse?.weatherData?.presMax || 1015,
          ),
          temp_max: weatherResponse?.weatherData?.tmax || 28.5,
          temp_min: weatherResponse?.weatherData?.tmin || 15.2,
          pressure_max: weatherResponse?.weatherData?.presMax || 1015,
          pressure_min: weatherResponse?.weatherData?.presMin || 1012,
        },
        wind: {
          speed: weatherResponse?.weatherData?.velmedia || 10.5,
          gust: weatherResponse?.weatherData?.racha || 15.2,
          direction: weatherResponse?.weatherData?.dir || 220,
        },
        precipitation: {
          rain: weatherResponse?.weatherData?.prec || 0,
          snow: weatherResponse?.weatherData?.nieve || 0,
        },
        solar: {
          radiation: weatherResponse?.weatherData?.inso || 8.5,
        },
        station: {
          id: weatherResponse?.station?.indicativo || '',
          name: weatherResponse?.station?.nombre || '',
          distance: weatherResponse?.distancia || 0,
        },
        weather: [
          {
            description: this.getWeatherDescription(weatherResponse?.weatherData || {}),
            icon: this.determineWeatherIcon(weatherResponse?.weatherData || {}),
          },
        ],
        date: weatherResponse?.weatherData?.fecha || new Date().toISOString().split('T')[0],
        time_max_temp: weatherResponse?.weatherData?.horatmax || '',
        time_min_temp: weatherResponse?.weatherData?.horatmin || '',
      };
    } catch (error: any) {
      logger.error('Error al obtener datos climáticos de AEMET', {
        error: error.message,
        stack: error.stack,
        sigpacData: sigpacData,
      });
      return this.getDefaultWeatherData();
    }
  }

  /**
   * Generates a weather description based on weather conditions
   * @param data - Weather data from AEMET
   * @returns Human-readable weather description
   */
  private getWeatherDescription(data: any): string {
    const conditions = [];

    if (data.tmax && data.tmax > 30) conditions.push('Caluroso');
    if (data.tmin && data.tmin < 5) conditions.push('Frío');
    if (data.prec && data.prec > 0) conditions.push('Lluvioso');
    if (data.velmedia && data.velmedia > 20) conditions.push('Ventoso');

    return conditions.length > 0 ? conditions.join(', ') : 'Condiciones normales para la época';
  }

  /**
   * Determines the weather icon based on weather conditions
   * @param data - Weather data from AEMET
   * @returns Icon code for the weather condition
   */
  private determineWeatherIcon(data: any): string {
    // Si hay precipitación
    if (data.prec && data.prec > 0) {
      return '10d'; // Lluvia
    }

    // Si hay nieve
    if (data.nieve && data.nieve > 0) {
      return '13d'; // Nieve
    }

    // Si hay viento fuerte
    if (data.velmedia && data.velmedia > 20) {
      return '50d'; // Viento
    }

    // Por defecto, despejado
    return '01d';
  }

  /**
   * Returns default weather data when API calls fail
   * @returns Default weather data object
   */
  private getDefaultWeatherData() {
    return {
      main: {
        temp: 25,
        humidity: 50,
        temp_max: 30,
        temp_min: 20,
        pressure_max: 1013,
        pressure_min: 1000,
      },
      wind: {
        speed: 10,
        gust: 15,
        direction: 0,
      },
      precipitation: {
        rain: 0,
        snow: 0,
      },
      solar: {
        radiation: 0,
      },
      station: {
        id: '',
        name: '',
        distance: 0,
      },
      weather: [
        {
          description: 'Despejado (datos por defecto)',
          icon: '01d',
        },
      ],
      date: new Date().toISOString().split('T')[0],
      time_max_temp: '',
      time_min_temp: '',
    };
  }

  /**
   * Calculates the distance between two geographical points using Haversine formula
   * @param lat1 - Latitude of point 1
   * @param lng1 - Longitude of point 1
   * @param lat2 - Latitude of point 2
   * @param lng2 - Longitude of point 2
   * @returns Distance in kilometers
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.degToRad(lat2 - lat1);
    const dLng = this.degToRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degToRad(lat1)) *
        Math.cos(this.degToRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distancia en km
  }

  private degToRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

export default new ParcelService();
