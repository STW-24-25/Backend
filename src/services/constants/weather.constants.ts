/**
 * Mapeo de estados del cielo de AEMET a iconos compatibles con el frontend
 */
export const AEMET_SKY_STATE_TO_ICON: { [key: string]: string } = {
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

/**
 * Datos climáticos por defecto cuando falla la API
 */
export const DEFAULT_WEATHER_DATA = {
  main: {
    temp: 25, // Temperatura por defecto en Celsius
    humidity: 50, // Humedad por defecto
    temp_max: 30, // Temperatura máxima por defecto
    temp_min: 20, // Temperatura mínima por defecto
    pressure_max: 1013, // Presión máxima por defecto en hPa
    pressure_min: 1000, // Presión mínima por defecto en hPa
  },
  wind: {
    speed: 10, // Velocidad del viento por defecto en km/h
    gust: 15, // Racha máxima por defecto en km/h
    direction: 0, // Dirección del viento por defecto en grados
  },
  precipitation: {
    rain: 0, // Precipitación por defecto en mm
    snow: 0, // Nieve por defecto en mm
  },
  solar: {
    radiation: 0, // Radiación solar por defecto en MJ/m²
  },
  station: {
    id: 'DEFAULT', // ID de estación por defecto
    name: 'Estación por defecto', // Nombre de estación por defecto
    distance: 0, // Distancia por defecto en km
  },
  weather: [
    {
      description: 'Despejado (datos por defecto)',
      icon: '01d', // Icono por defecto (soleado)
    },
  ],
  date: new Date().toISOString().split('T')[0], // Fecha actual
  time_max_temp: '12:00', // Hora de temperatura máxima por defecto
  time_min_temp: '00:00', // Hora de temperatura mínima por defecto
};
