import mongoose from 'mongoose';
import ParcelModel from '../models/parcel.model';
import ProductModel from '../models/product.model';
import logger from '../utils/logger';
import dotenv from 'dotenv';
import { Aemet } from 'aemet-api';
import { CAPITAL_NAMES } from './constants/location.constants';
import area from '@turf/area';

// Load environment variables
dotenv.config();

// Initialize AEMET client with API key from .env
const aemetClient = new Aemet(process.env.AEMET_API_KEY || 'YOUR_API_KEY');

/**
 * Service class that handles parcel-related operations.
 * Includes operations against the database and external API calls to Sigpac.
 */
class ParcelService {
  private municipalitiesCache: { [key: string]: { [key: string]: string } } = {};

  /**
   * Formatea un nombre para tener la primera letra en mayúscula y el resto en minúsculas
   * @param name - Nombre a formatear
   * @returns Nombre formateado
   */
  private formatName(name: string): string {
    if (!name) return '';
    return name.toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase());
  }

  /**
   * Creates a new parcel in the database.
   * @param parcelData - The parcel data to be saved
   * @returns The created parcel
   */
  async createParcel(parcelData: any) {
    try {
      // Get SIGPAC data first to extract province and municipality
      const sigpacData = await this.getParcelInfoFromSigpac(
        Number(parcelData.location.lng),
        Number(parcelData.location.lat),
      );

      // Convert location format from {lat, lng} to GeoJSON Point
      const parcelToCreate = {
        ...parcelData,
        location: {
          type: 'Point',
          coordinates: [Number(parcelData.location.lng), Number(parcelData.location.lat)],
        },
        // Add province and municipality from SIGPAC data using correct field names
        province: sigpacData.declarationData.province,
        municipality: sigpacData.declarationData.municipality,
        size: sigpacData.declarationData.superficie,
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

          const parcelGeoJSON = await this.getParcelGeoJSON(lng, lat);
          logger.info('Parcel GeoJSON data:', parcelGeoJSON);

          // Get weather data using the stored province and municipality
          const weatherData = await this.getWeatherData(lng, lat, {
            declarationData: {
              provincia: parcel.province,
              municipio: parcel.municipality,
            },
          });

          return {
            parcel: {
              geoJSON: parcelGeoJSON.parcelGeoJSON,
              products: parcel.products,
              createdAt: parcel.createdAt,
              municipality: parcel.municipality.split(' - ')[1],
              province: parcel.province.split(' - ')[1],
              size: parcel.size,
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
   * Obtiene solo el GeoJSON de una parcela desde SIGPAC
   * @param lng - Longitud
   * @param lat - Latitud
   * @returns GeoJSON de la parcela
   */
  private async getParcelGeoJSON(lng: number, lat: number) {
    try {
      const responseGeoJSON = await fetch(
        `https://sigpac-hubcloud.es/servicioconsultassigpac/query/recinfobypoint/4258/${lng}/${lat}.geojson`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate, br',
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

      return {
        parcelGeoJSON: {
          type: rawParcelGeoJSON.type,
          features: rawParcelGeoJSON.features.map((feature: { type: string; geometry: any }) => ({
            type: feature.type,
            geometry: feature.geometry,
          })),
        },
        provinceCode: String(rawParcelGeoJSON.features[0].properties.provincia).padStart(2, '0'),
        municipalityCode: Number(rawParcelGeoJSON.features[0].properties.municipio),
        usoSigpac: rawParcelGeoJSON.features[0].properties.uso_sigpac || '',
        geometry: rawParcelGeoJSON.features[0].geometry,
      };
    } catch (error: any) {
      logger.error('Error fetching GeoJSON from Sigpac', error);
      throw new Error(`Failed to fetch GeoJSON from Sigpac: ${error.message}`);
    }
  }

  /**
   * Obtiene los datos de provincia y municipio basados en los códigos
   * @param provinceCode - Código de provincia
   * @param municipalityCode - Código de municipio
   * @returns Información formateada de provincia y municipio
   */
  private async getLocationInfo(provinceCode: string, municipalityCode: number) {
    try {
      // Get province name and ensure it exists
      const provinceName = CAPITAL_NAMES[provinceCode];
      if (!provinceName) {
        throw new Error(`Province code ${provinceCode} not found in capital names`);
      }

      // Get municipality name from cached data or fetch it
      if (!this.municipalitiesCache[provinceCode]) {
        try {
          const municResponse = await fetch(
            `https://sigpac-hubcloud.es/codigossigpac/municipio${provinceCode}.json`,
            {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                Accept: 'application/json',
              },
            },
          );
          const municipalityData = await municResponse.json();

          // Convert the array format to our cache format
          this.municipalitiesCache[provinceCode] = {};
          if (municipalityData.codigos && Array.isArray(municipalityData.codigos)) {
            municipalityData.codigos.forEach((item: { codigo: number; descripcion: string }) => {
              this.municipalitiesCache[provinceCode][item.codigo] = item.descripcion;
            });
          }
        } catch (error) {
          logger.error('Error fetching municipality data:', error);
          this.municipalitiesCache[provinceCode] = {};
        }
      }

      const municipalityName = this.formatName(
        this.municipalitiesCache[provinceCode][municipalityCode] || '',
      );
      const formattedProvinceName = this.formatName(provinceName);

      return {
        province: `${provinceCode} - ${formattedProvinceName}`,
        municipality: `${municipalityCode} - ${municipalityName}`,
      };
    } catch (error: any) {
      logger.error('Error getting location info', error);
      throw new Error(`Failed to get location info: ${error.message}`);
    }
  }

  /**
   * Obtiene toda la información de una parcela desde SIGPAC
   */
  private async getParcelInfoFromSigpac(lng: number, lat: number) {
    try {
      // Get GeoJSON and codes first
      const parcelData = await this.getParcelGeoJSON(lng, lat);

      // Get province and municipality info
      const locationInfo = await this.getLocationInfo(
        parcelData.provinceCode,
        parcelData.municipalityCode,
      );

      // Calculate area from GeoJSON using turf
      const surfaceArea = area(parcelData.geometry) / 10000; // Convert from m² to hectares

      return {
        parcelGeoJSON: parcelData.parcelGeoJSON,
        declarationData: {
          ...locationInfo,
          superficie: Number(surfaceArea.toFixed(4)),
          cultivo: parcelData.usoSigpac,
        },
      };
    } catch (error: any) {
      logger.error('Error fetching parcel from Sigpac', error);
      throw new Error(`Failed to fetch parcel data from Sigpac: ${error.message}`);
    }
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
      const [provinceCode, provinceName] = sigpacData.declarationData.provincia.split(' - ');
      const formattedProvinceName = this.formatName(provinceName);

      logger.info(`Código de provincia: ${provinceCode}`);
      logger.info(`Nombre de provincia: ${formattedProvinceName}`);

      if (!provinceName) {
        logger.error('No se encontró el nombre de la provincia en los datos de declaración');
        return this.getDefaultWeatherData();
      }

      // Get weather data using AEMET method
      const weatherResponse = await aemetClient.getWeatherByCoordinates(
        lat,
        lng,
        formattedProvinceName,
      );
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

  /**
   * Gets all parcels basic information for a user
   * @param userId - User ID
   * @returns Array of parcels with basic information (municipality, location, crop)
   */
  async getAllParcels(userId: string) {
    try {
      // Get user with populated parcels
      const user = await mongoose.model('User').findById(userId).populate('parcels');

      if (!user) {
        throw new Error('User not found');
      }

      // Transform parcels to required format
      return user.parcels.map((parcel: any) => ({
        municipio: parcel.municipality.split(' - ')[1], // Remove code from municipality
        ubicacion: [parcel.location.coordinates[1], parcel.location.coordinates[0]], // lat, lng directly from db
        producto: parcel.products[0] || 'Sin producto', // Take first product as main product
      }));
    } catch (error: any) {
      logger.error('Error getting all parcels', error);
      throw new Error(`Failed to get all parcels: ${error.message}`);
    }
  }
}

export default new ParcelService();
