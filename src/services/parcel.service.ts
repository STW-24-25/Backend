import mongoose from 'mongoose';
import { localizacion, consulta } from 'sigpac-client';
import ParcelModel, { CropType, ParcelSize } from '../models/parcel.model';
import logger from '../utils/logger';
import axios from 'axios';
import dotenv from 'dotenv';
import { Aemet } from 'aemet-api';
import { AutonomousComunity } from '../models/user.model';

// Load environment variables
dotenv.config();

// Initialize AEMET client
const aemetClient = new Aemet(process.env.AEMET_API_KEY || '');

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
      // Convert coordinates to province code
      const provinceCode = await this.getProvinceCodeFromCoordinates(lng, lat);

      // Get all municipalities from AEMET
      const municipalities = await aemetClient.getMunicipalities();

      // Filter municipalities by province code
      const filteredMunicipalities = municipalities.filter(m => m.id.startsWith(provinceCode));

      let municipalityCode = '28079'; // Default Madrid
      let municipalityName = 'Madrid';

      if (filteredMunicipalities.length > 0) {
        // Get approximate coordinates for province capitals
        const provincialCapitals = this.getProvincialCapitals();
        const capitalCoords = provincialCapitals[provinceCode];

        if (capitalCoords) {
          // Find the capital's municipality code
          const capital = filteredMunicipalities.find(
            m =>
              m.nombre.toLowerCase().includes('capital') ||
              this.isProvincialCapital(m.nombre, provinceCode),
          );

          if (capital) {
            municipalityCode = capital.id;
            municipalityName = capital.nombre;
          } else {
            // Just use the first one
            municipalityCode = filteredMunicipalities[0].id;
            municipalityName = filteredMunicipalities[0].nombre;
          }
        } else {
          // If no coordinates for capital, just use first municipality
          municipalityCode = filteredMunicipalities[0].id;
          municipalityName = filteredMunicipalities[0].nombre;
        }

        logger.info(
          `Usando municipio ${municipalityName} (${municipalityCode}) para el pronóstico del tiempo`,
        );
      }

      try {
        // Get weather forecast for the municipality
        const forecast = await aemetClient.getSimpleForecast(municipalityCode);

        if (forecast && forecast.today) {
          // Keep original Spanish description
          const description = forecast.today.descripcion || 'Sin datos';

          return {
            main: {
              // Temperature data (max temperature)
              temp: forecast.today.tmp ? forecast.today.tmp.max : 25,
              humidity: 50, // AEMET API does not provide humidity in simple forecast
            },
            wind: {
              // Default wind speed as it's not available in the simple forecast
              speed: 10,
            },
            weather: [
              {
                description: description,
                icon: this.mapAemetSkyToIcon(description),
              },
            ],
          };
        }
      } catch (aemetError) {
        logger.error('Error al obtener datos de AEMET API', aemetError);
        // Continue to fallback
      }

      // Fallback to default values if AEMET API fails
      logger.info('Usando valores climáticos por defecto');
      return this.getDefaultWeatherData();
    } catch (error: any) {
      logger.error('Error al obtener datos climáticos de AEMET', error);

      // Fallback to default values if AEMET API fails
      return this.getDefaultWeatherData();
    }
  }

  /**
   * Returns default weather data when API calls fail
   * @returns Default weather data object
   */
  private getDefaultWeatherData() {
    return {
      main: {
        temp: 25, // Default temperature in Celsius
        humidity: 50, // Default humidity
      },
      wind: {
        speed: 10, // Default wind speed in km/h
      },
      weather: [
        {
          description: 'Despejado (datos por defecto)',
          icon: '01d', // Default icon (sunny)
        },
      ],
    };
  }

  /**
   * Gets province code from coordinates using SIGPAC API
   * @param lng - Longitude coordinate
   * @param lat - Latitude coordinate
   * @returns Province code (2 digits)
   */
  private async getProvinceCodeFromCoordinates(lng: number, lat: number): Promise<string> {
    try {
      // Intentar obtener información real de SIGPAC
      const parcelGeoJSON = await localizacion('parcela', { lng, lat });

      if (parcelGeoJSON && parcelGeoJSON.features && parcelGeoJSON.features.length > 0) {
        const properties = parcelGeoJSON.features[0].properties;
        if (properties && properties.provincia) {
          // Si la provincia viene en formato "XX - Nombre Provincia", extraer el código
          if (typeof properties.provincia === 'string' && properties.provincia.includes(' - ')) {
            const provinceCode = properties.provincia.split(' - ')[0].padStart(2, '0');
            logger.info(
              `Provincia encontrada en SIGPAC: ${properties.provincia} (código: ${provinceCode})`,
            );
            return provinceCode;
          }

          // Si es solo el número, asegurarse de que tenga 2 dígitos
          if (typeof properties.provincia === 'number' || !isNaN(Number(properties.provincia))) {
            const provinceCode = String(properties.provincia).padStart(2, '0');
            logger.info(`Provincia encontrada en SIGPAC: ${provinceCode}`);
            return provinceCode;
          }
        }
      }

      logger.warn('No se pudo obtener la provincia desde SIGPAC, usando estimación aproximada');
      return this.estimateProvinceCodeFromCoordinates(lng, lat);
    } catch (error) {
      logger.error('Error al obtener provincia desde SIGPAC', error);
      // Si falla la llamada a SIGPAC, usar el método aproximado como fallback
      return this.estimateProvinceCodeFromCoordinates(lng, lat);
    }
  }

  /**
   * Estimates province code from coordinates based on geographic boundaries
   * @param lng - Longitude coordinate
   * @param lat - Latitude coordinate
   * @returns Estimated province code (2 digits)
   */
  private estimateProvinceCodeFromCoordinates(lng: number, lat: number): string {
    // Spain regions by approximate coordinates
    if (lat > 43) {
      if (lng < -7) return '15'; // A Coruña
      if (lng < -6) return '27'; // Lugo
      if (lng < -4.5) return '33'; // Asturias
      if (lng < -3) return '39'; // Cantabria
      if (lng < -2) return '48'; // Vizcaya
      if (lng < 0) return '20'; // Guipúzcoa
      return '31'; // Navarra
    } else if (lat > 42) {
      if (lng < -7) return '32'; // Ourense
      if (lng < -6) return '24'; // León
      if (lng < -4) return '34'; // Palencia
      if (lng < -2) return '09'; // Burgos
      if (lng < 0) return '01'; // Álava
      if (lng < 1) return '26'; // La Rioja
      if (lng < 2) return '31'; // Navarra
      return '22'; // Huesca
    } else if (lat > 41) {
      if (lng < -7) return '49'; // Zamora
      if (lng < -5) return '47'; // Valladolid
      if (lng < -3) return '42'; // Soria
      if (lng < -1) return '50'; // Zaragoza
      if (lng < 1) return '50'; // Zaragoza
      if (lng < 2) return '25'; // Lleida
      return '08'; // Barcelona
    } else if (lat > 40) {
      if (lng < -7) return '37'; // Salamanca
      if (lng < -5) return '05'; // Ávila
      if (lng < -4) return '40'; // Segovia
      if (lng < -3) return '28'; // Madrid
      if (lng < -1) return '19'; // Guadalajara
      if (lng < 0) return '44'; // Teruel
      if (lng < 1) return '44'; // Teruel
      if (lng < 2) return '43'; // Tarragona
      return '12'; // Castellón
    } else if (lat > 39) {
      if (lng < -7) return '10'; // Cáceres
      if (lng < -5) return '45'; // Toledo
      if (lng < -3) return '16'; // Cuenca
      if (lng < -1) return '16'; // Cuenca
      if (lng < 0) return '46'; // Valencia
      return '12'; // Castellón
    } else if (lat > 38) {
      if (lng < -7) return '06'; // Badajoz
      if (lng < -5) return '13'; // Ciudad Real
      if (lng < -3) return '02'; // Albacete
      if (lng < -1) return '46'; // Valencia
      return '03'; // Alicante
    } else if (lat > 37) {
      if (lng < -7) return '21'; // Huelva
      if (lng < -6) return '41'; // Sevilla
      if (lng < -5) return '14'; // Córdoba
      if (lng < -3) return '23'; // Jaén
      if (lng < -2) return '02'; // Albacete
      if (lng < 0) return '30'; // Murcia
      return '03'; // Alicante
    } else {
      if (lng < -7) return '21'; // Huelva
      if (lng < -6) return '41'; // Sevilla
      if (lng < -5) return '11'; // Cádiz
      if (lng < -4) return '29'; // Málaga
      if (lng < -2) return '18'; // Granada
      if (lng < 0) return '04'; // Almería
      return '30'; // Murcia
    }
  }

  /**
   * Maps AEMET sky state to an icon compatible with the frontend
   * @param skyState - Sky state from AEMET
   * @returns Icon code similar to OpenWeatherMap
   */
  private mapAemetSkyToIcon(skyState?: string): string {
    // Example values, adjust based on actual values returned by AEMET
    const skyStateMap: { [key: string]: string } = {
      Despejado: '01d',
      'Poco nuboso': '02d',
      'Parcialmente nuboso': '03d',
      Nuboso: '04d',
      'Muy nuboso': '04d',
      Cubierto: '04d',
      'Nubes altas': '03d',
      'Intervalos nubosos': '03d',
      Niebla: '50d',
      Bruma: '50d',
      Lluvia: '10d',
      'Lluvia débil': '09d',
      Chubascos: '09d',
      Tormenta: '11d',
      Nieve: '13d',
      Granizo: '13d',
    };

    return skyState ? skyStateMap[skyState] || '01d' : '01d';
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
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat],
            },
            $maxDistance: 10, // 10 metros de distancia máxima
          },
        },
      });

      // If parcel doesn't exist, create it
      if (!parcel) {
        const sigpacData = await this.getParcelInfoFromSigpac(lng, lat);

        // Extract properties from Sigpac response
        const parcelFeature = sigpacData.parcelGeoJSON.features[0];
        const parcelProperties = parcelFeature.properties;
        const declarationProperties = sigpacData.declarationData;

        // Determine crop type based on declaration data
        let cropType = CropType.OTHERS; // Default
        if (declarationProperties && declarationProperties.parc_producto) {
          // Map Sigpac crop codes to your application's crop types
          // This is a simplified example
          const cropMapping: any = {
            '5': CropType.CEREALS, // Barley
            '1': CropType.CEREALS, // Wheat
            '4': CropType.CEREALS, // Oats
            '6': CropType.LEGUMES, // Legumes
            '12': CropType.VINEYARDS, // Vineyard
            '23': CropType.OLIVE_GROVES, // Olive trees
            '33': CropType.FRUIT_TREES, // Fruit trees
          };

          cropType =
            cropMapping[declarationProperties.parc_producto.split(' - ')[0]] || CropType.OTHERS;
        }

        // Determine parcel size based on area
        let parcelSize = ParcelSize.SMALL;
        const area = parcelProperties.area || 0;
        if (area > 100000) {
          // 10 hectares
          parcelSize = ParcelSize.LARGE;
        } else if (area > 20000) {
          // 2 hectares
          parcelSize = ParcelSize.MEDIUM;
        }

        // Get province code using our enhanced method
        const provinceCode = await this.getProvinceCodeFromCoordinates(lng, lat);

        // Format province for logging
        const provinceName = parcelProperties.provincia || `Código: ${provinceCode}`;
        logger.info(`Parcela en provincia: ${provinceName}`);

        // MapSigpacProvinceToAutonomousCommunity debería devolver un valor del enum AutonomousComunity
        const autonomousCommunity = this.mapSigpacProvinceToAutonomousCommunity(
          parcelProperties.provincia || provinceCode,
        );

        // Create parcel object with a simple structure
        const newParcelData = {
          user: userId,
          size: parcelSize,
          crop: cropType,
          location: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          autonomousCommunity: autonomousCommunity,
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
      logger.error('Error al obtener parcela por coordenadas', error);
      throw new Error(`No se pudo obtener la parcela: ${error.message}`);
    }
  }

  /**
   * Maps Sigpac province codes to autonomous community values in English.
   * @param province - Province code or name from Sigpac
   * @returns Autonomous community name in English
   */
  private mapSigpacProvinceToAutonomousCommunity(province: string): AutonomousComunity {
    // Extract province code if in format "XX - Province Name"
    const provinceCode = province.includes(' - ') ? province.split(' - ')[0] : province;

    // Map based on province codes
    const provinceMap: { [key: string]: AutonomousComunity } = {
      // Andalucía
      '4': AutonomousComunity.ANDALUCIA,
      '11': AutonomousComunity.ANDALUCIA,
      '14': AutonomousComunity.ANDALUCIA,
      '18': AutonomousComunity.ANDALUCIA,
      '21': AutonomousComunity.ANDALUCIA,
      '23': AutonomousComunity.ANDALUCIA,
      '29': AutonomousComunity.ANDALUCIA,
      '41': AutonomousComunity.ANDALUCIA,
      // Aragón
      '22': AutonomousComunity.ARAGON,
      '44': AutonomousComunity.ARAGON,
      '50': AutonomousComunity.ARAGON,
      // Asturias
      '33': AutonomousComunity.ASTURIAS,
      // Baleares
      '7': AutonomousComunity.BALEARES,
      // Canarias
      '35': AutonomousComunity.CANARIAS,
      '38': AutonomousComunity.CANARIAS,
      // Cantabria
      '39': AutonomousComunity.CANTABRIA,
      // Castilla-La Mancha
      '2': AutonomousComunity.CASTILLA_LA_MANCHA,
      '13': AutonomousComunity.CASTILLA_LA_MANCHA,
      '16': AutonomousComunity.CASTILLA_LA_MANCHA,
      '19': AutonomousComunity.CASTILLA_LA_MANCHA,
      '45': AutonomousComunity.CASTILLA_LA_MANCHA,
      // Castilla y León
      '5': AutonomousComunity.CASTILLA_LEON,
      '9': AutonomousComunity.CASTILLA_LEON,
      '24': AutonomousComunity.CASTILLA_LEON,
      '34': AutonomousComunity.CASTILLA_LEON,
      '37': AutonomousComunity.CASTILLA_LEON,
      '40': AutonomousComunity.CASTILLA_LEON,
      '42': AutonomousComunity.CASTILLA_LEON,
      '47': AutonomousComunity.CASTILLA_LEON,
      '49': AutonomousComunity.CASTILLA_LEON,
      // Cataluña
      '8': AutonomousComunity.CATALUGNA,
      '17': AutonomousComunity.CATALUGNA,
      '25': AutonomousComunity.CATALUGNA,
      '43': AutonomousComunity.CATALUGNA,
      // Extremadura
      '6': AutonomousComunity.EXTREMADURA,
      '10': AutonomousComunity.EXTREMADURA,
      // Galicia
      '15': AutonomousComunity.GALICIA,
      '27': AutonomousComunity.GALICIA,
      '32': AutonomousComunity.GALICIA,
      '36': AutonomousComunity.GALICIA,
      // Madrid
      '28': AutonomousComunity.MADRID,
      // Murcia
      '30': AutonomousComunity.MURCIA,
      // Navarra
      '31': AutonomousComunity.NAVARRA,
      // País Vasco
      '1': AutonomousComunity.PAIS_VASCO,
      '20': AutonomousComunity.PAIS_VASCO,
      '48': AutonomousComunity.PAIS_VASCO,
      // La Rioja
      '26': AutonomousComunity.RIOJA,
      // Comunidad Valenciana
      '3': AutonomousComunity.VALENCIA,
      '12': AutonomousComunity.VALENCIA,
      '46': AutonomousComunity.VALENCIA,
      // Ciudades autónomas
      '51': AutonomousComunity.CEUTA,
      '52': AutonomousComunity.MELILLA,
    };

    return provinceMap[provinceCode] || AutonomousComunity.ARAGON; // Default to Aragon if not found
  }

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

  // Datos aproximados de capitales de provincia
  private getProvincialCapitals(): { [provinceCode: string]: { lat: number; lng: number } } {
    return {
      // Andalucía
      '04': { lat: 36.8381, lng: -2.4597 }, // Almería
      '11': { lat: 36.527, lng: -6.2885 }, // Cádiz
      '14': { lat: 37.8882, lng: -4.7794 }, // Córdoba
      '18': { lat: 37.1773, lng: -3.5986 }, // Granada
      '21': { lat: 37.2571, lng: -6.9498 }, // Huelva
      '23': { lat: 37.7796, lng: -3.7849 }, // Jaén
      '29': { lat: 36.7213, lng: -4.4214 }, // Málaga
      '41': { lat: 37.3891, lng: -5.9845 }, // Sevilla
      // Aragón
      '22': { lat: 42.1362, lng: -0.4086 }, // Huesca
      '44': { lat: 40.3456, lng: -1.1065 }, // Teruel
      '50': { lat: 41.6488, lng: -0.8891 }, // Zaragoza
      // Asturias
      '33': { lat: 43.3614, lng: -5.8593 }, // Oviedo
      // Islas Baleares
      '07': { lat: 39.5696, lng: 2.6502 }, // Palma de Mallorca
      // Canarias
      '35': { lat: 28.1248, lng: -15.43 }, // Las Palmas de Gran Canaria
      '38': { lat: 28.4683, lng: -16.2546 }, // Santa Cruz de Tenerife
      // Cantabria
      '39': { lat: 43.4647, lng: -3.8044 }, // Santander
      // Castilla-La Mancha
      '02': { lat: 38.9942, lng: -1.8564 }, // Albacete
      '13': { lat: 38.986, lng: -3.9272 }, // Ciudad Real
      '16': { lat: 40.0703, lng: -2.1374 }, // Cuenca
      '19': { lat: 40.6336, lng: -3.1604 }, // Guadalajara
      '45': { lat: 39.8628, lng: -4.0273 }, // Toledo
      // Castilla y León
      '05': { lat: 40.6535, lng: -4.6981 }, // Ávila
      '09': { lat: 42.3439, lng: -3.6969 }, // Burgos
      '24': { lat: 42.5987, lng: -5.5671 }, // León
      '34': { lat: 42.0096, lng: -4.5288 }, // Palencia
      '37': { lat: 40.9701, lng: -5.6635 }, // Salamanca
      '40': { lat: 40.9429, lng: -4.1088 }, // Segovia
      '42': { lat: 41.7636, lng: -2.4649 }, // Soria
      '47': { lat: 41.6523, lng: -4.7245 }, // Valladolid
      '49': { lat: 41.5034, lng: -5.7449 }, // Zamora
      // Cataluña
      '08': { lat: 41.3851, lng: 2.1734 }, // Barcelona
      '17': { lat: 41.9792, lng: 2.8187 }, // Girona
      '25': { lat: 41.6176, lng: 0.62 }, // Lleida
      '43': { lat: 41.1187, lng: 1.2453 }, // Tarragona
      // Extremadura
      '06': { lat: 38.8794, lng: -6.9706 }, // Badajoz
      '10': { lat: 39.4752, lng: -6.3726 }, // Cáceres
      // Galicia
      '15': { lat: 43.3623, lng: -8.4115 }, // A Coruña
      '27': { lat: 43.0123, lng: -7.5567 }, // Lugo
      '32': { lat: 42.3358, lng: -7.8639 }, // Ourense
      '36': { lat: 42.433, lng: -8.648 }, // Pontevedra
      // Madrid
      '28': { lat: 40.4168, lng: -3.7038 }, // Madrid
      // Murcia
      '30': { lat: 37.9922, lng: -1.1307 }, // Murcia
      // Navarra
      '31': { lat: 42.8169, lng: -1.6432 }, // Pamplona
      // País Vasco
      '01': { lat: 42.8467, lng: -2.6716 }, // Vitoria
      '20': { lat: 43.3224, lng: -1.984 }, // San Sebastián
      '48': { lat: 43.263, lng: -2.935 }, // Bilbao
      // La Rioja
      '26': { lat: 42.465, lng: -2.4506 }, // Logroño
      // Comunidad Valenciana
      '03': { lat: 38.3452, lng: -0.4815 }, // Alicante
      '12': { lat: 39.9864, lng: -0.0513 }, // Castellón
      '46': { lat: 39.4699, lng: -0.3763 }, // Valencia
      // Ciudades autónomas
      '51': { lat: 35.8894, lng: -5.3213 }, // Ceuta
      '52': { lat: 35.2923, lng: -2.9383 }, // Melilla
    };
  }

  /**
   * Determines if a municipality name corresponds to a provincial capital
   */
  private isProvincialCapital(municipalityName: string, provinceCode: string): boolean {
    const capitalNames: { [code: string]: string } = {
      '04': 'almeria',
      '11': 'cadiz',
      '14': 'cordoba',
      '18': 'granada',
      '21': 'huelva',
      '23': 'jaen',
      '29': 'malaga',
      '41': 'sevilla',
      '22': 'huesca',
      '44': 'teruel',
      '50': 'zaragoza',
      '33': 'oviedo',
      '07': 'palma',
      '35': 'palmas',
      '38': 'santa cruz de tenerife',
      '39': 'santander',
      '02': 'albacete',
      '13': 'ciudad real',
      '16': 'cuenca',
      '19': 'guadalajara',
      '45': 'toledo',
      '05': 'avila',
      '09': 'burgos',
      '24': 'leon',
      '34': 'palencia',
      '37': 'salamanca',
      '40': 'segovia',
      '42': 'soria',
      '47': 'valladolid',
      '49': 'zamora',
      '08': 'barcelona',
      '17': 'girona',
      '25': 'lleida',
      '43': 'tarragona',
      '06': 'badajoz',
      '10': 'caceres',
      '15': 'coruña',
      '27': 'lugo',
      '32': 'ourense',
      '36': 'pontevedra',
      '28': 'madrid',
      '30': 'murcia',
      '31': 'pamplona',
      '01': 'vitoria',
      '20': 'san sebastian',
      '48': 'bilbao',
      '26': 'logroño',
      '03': 'alicante',
      '12': 'castellon',
      '46': 'valencia',
      '51': 'ceuta',
      '52': 'melilla',
    };

    const normalizedName = municipalityName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Remove accents

    const capitalName = capitalNames[provinceCode] || '';
    return capitalName !== '' && normalizedName.includes(capitalName);
  }
}

export default new ParcelService();
