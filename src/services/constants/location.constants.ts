import { AutonomousComunity } from '../../models/user.model';

/**
 * Mapeo de códigos de comunidad autónoma a enum AutonomousComunity
 */
export const AUTONOMOUS_COMMUNITY_CODE_MAP: { [key: string]: AutonomousComunity } = {
  '1': AutonomousComunity.ANDALUCIA,
  '2': AutonomousComunity.ARAGON,
  '3': AutonomousComunity.ASTURIAS,
  '4': AutonomousComunity.BALEARES,
  '5': AutonomousComunity.CANARIAS,
  '6': AutonomousComunity.CANTABRIA,
  '7': AutonomousComunity.CASTILLA_LA_MANCHA,
  '8': AutonomousComunity.CASTILLA_LEON,
  '9': AutonomousComunity.CATALUGNA,
  '10': AutonomousComunity.EXTREMADURA,
  '11': AutonomousComunity.GALICIA,
  '12': AutonomousComunity.MADRID,
  '13': AutonomousComunity.MURCIA,
  '14': AutonomousComunity.NAVARRA,
  '15': AutonomousComunity.PAIS_VASCO,
  '16': AutonomousComunity.RIOJA,
  '17': AutonomousComunity.VALENCIA,
  '18': AutonomousComunity.CEUTA,
  '19': AutonomousComunity.MELILLA,
};

/**
 * Coordinates for provincial capitals
 */
export const PROVINCIAL_CAPITALS: { [provinceCode: string]: { lat: number; lng: number } } = {
  // Andalucía
  '04': { lat: 36.8381, lng: -2.4597 }, // Almería #
  '11': { lat: 36.527, lng: -6.2885 }, // Cádiz #
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
  '07': { lat: 39.5696, lng: 2.6502 }, // Palma de Mallorca #
  // Canarias
  '35': { lat: 28.1248, lng: -15.43 }, // Las Palmas de Gran Canaria
  '38': { lat: 28.4683, lng: -16.2546 }, // Santa Cruz de Tenerife
  // Cantabria
  '39': { lat: 43.4647, lng: -3.8044 }, // Santander
  // Castilla-La Mancha
  '02': { lat: 38.9942, lng: -1.8564 }, // Albacete #
  '13': { lat: 38.986, lng: -3.9272 }, // Ciudad Real
  '16': { lat: 40.0703, lng: -2.1374 }, // Cuenca
  '19': { lat: 40.6336, lng: -3.1604 }, // Guadalajara
  '45': { lat: 39.8628, lng: -4.0273 }, // Toledo
  // Castilla y León
  '05': { lat: 40.6535, lng: -4.6981 }, // Ávila #
  '09': { lat: 42.3439, lng: -3.6969 }, // Burgos #
  '24': { lat: 42.5987, lng: -5.5671 }, // León
  '34': { lat: 42.0096, lng: -4.5288 }, // Palencia
  '37': { lat: 40.9701, lng: -5.6635 }, // Salamanca
  '40': { lat: 40.9429, lng: -4.1088 }, // Segovia
  '42': { lat: 41.7636, lng: -2.4649 }, // Soria
  '47': { lat: 41.6523, lng: -4.7245 }, // Valladolid
  '49': { lat: 41.5034, lng: -5.7449 }, // Zamora
  // Cataluña
  '08': { lat: 41.3851, lng: 2.1734 }, // Barcelona #
  '17': { lat: 41.9792, lng: 2.8187 }, // Girona
  '25': { lat: 41.6176, lng: 0.62 }, // Lleida
  '43': { lat: 41.1187, lng: 1.2453 }, // Tarragona
  // Extremadura
  '06': { lat: 38.8794, lng: -6.9706 }, // Badajoz #
  '10': { lat: 39.4752, lng: -6.3726 }, // Cáceres #
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
  '01': { lat: 42.8467, lng: -2.6716 }, // Vitoria #
  '20': { lat: 43.3224, lng: -1.984 }, // San Sebastián
  '48': { lat: 43.263, lng: -2.935 }, // Bilbao
  // La Rioja
  '26': { lat: 42.465, lng: -2.4506 }, // Logroño
  // Comunidad Valenciana
  '03': { lat: 38.3452, lng: -0.4815 }, // Alicante #
  '12': { lat: 39.9864, lng: -0.0513 }, // Castellón #
  '46': { lat: 39.4699, lng: -0.3763 }, // Valencia
  // Ciudades autónomas
  '51': { lat: 35.8894, lng: -5.3213 }, // Ceuta
  '52': { lat: 35.2923, lng: -2.9383 }, // Melilla
};

/**
 * Map of province codes to their capital names in Spain
 * Format: provinceCode: capitalName
 */
export const CAPITAL_NAMES: { [code: string]: string } = {
  '02': 'Albacete',
  '03': 'Alicante/Alacant',
  '04': 'Almería',
  '01': 'Araba/Álava',
  '33': 'Asturias',
  '05': 'Ávila',
  '06': 'Badajoz',
  '07': 'Balears, Illes',
  '08': 'Barcelona',
  '48': 'Bizkaia',
  '09': 'Burgos',
  '10': 'Cáceres',
  '11': 'Cádiz',
  '39': 'Cantabria',
  '12': 'Castellón/Castelló',
  '13': 'Ciudad Real',
  '14': 'Córdoba',
  '15': 'Coruña, A',
  '16': 'Cuenca',
  '20': 'Gipuzkoa',
  '17': 'Girona',
  '18': 'Granada',
  '19': 'Guadalajara',
  '21': 'Huelva',
  '22': 'Huesca',
  '23': 'Jaén',
  '24': 'León',
  '25': 'Lleida',
  '27': 'Lugo',
  '28': 'Madrid',
  '29': 'Málaga',
  '30': 'Murcia',
  '31': 'Navarra',
  '32': 'Ourense',
  '34': 'Palencia',
  '35': 'Palmas, Las',
  '36': 'Pontevedra',
  '26': 'Rioja, La',
  '37': 'Salamanca',
  '38': 'Santa Cruz de Tenerife',
  '40': 'Segovia',
  '41': 'Sevilla',
  '42': 'Soria',
  '43': 'Tarragona',
  '44': 'Teruel',
  '45': 'Toledo',
  '46': 'Valencia/València',
  '47': 'Valladolid',
  '49': 'Zamora',
  '50': 'Zaragoza',
  '51': 'Ceuta',
  '52': 'Melilla',
};

export const PROVINCE_MAPPING: {
  [code: number]: {
    name: string;
    capital: {
      name: string;
      coordinates: {
        lat: number;
        lng: number;
      };
    };
  };
} = {
  1: {
    name: 'Araba/Álava',
    capital: { name: 'Vitoria', coordinates: { lat: 42.85058789, lng: -2.67275685 } },
  },
  2: {
    name: 'Albacete',
    capital: { name: 'Albacete', coordinates: { lat: 38.99588053, lng: -1.85574745 } },
  },
  3: {
    name: 'Alicante/Alacant',
    capital: { name: 'Alicante', coordinates: { lat: 38.34548705, lng: -0.4831832 } },
  },
  4: {
    name: 'Almería',
    capital: { name: 'Almería', coordinates: { lat: 36.83892362, lng: -2.46413188 } },
  },
  5: {
    name: 'Ávila',
    capital: { name: 'Ávila', coordinates: { lat: 40.65586958, lng: -4.69771277 } },
  },
  6: {
    name: 'Badajoz',
    capital: { name: 'Badajoz', coordinates: { lat: 37.87874339, lng: -7.97099704 } },
  },
  7: {
    name: 'Balears, Illes',
    capital: { name: 'Palma', coordinates: { lat: 39.57114699, lng: 2.65181698 } },
  },
  8: {
    name: 'Barcelona',
    capital: { name: 'Barcelona', coordinates: { lat: 41.38424664, lng: 2.1763492 } },
  },
  9: {
    name: 'Burgos',
    capital: { name: 'Burgos', coordinates: { lat: 42.34113004, lng: -3.70419805 } },
  },
  10: {
    name: 'Cáceres',
    capital: { name: 'Cáceres', coordinates: { lat: 39.47316762, lng: -6.37121092 } },
  },
  11: {
    name: 'Cádiz',
    capital: { name: 'Cádiz', coordinates: { lat: 36.52171152, lng: -6.28414575 } },
  },
  12: {
    name: 'Castellón/Castelló',
    capital: {
      name: 'Castellón de la Plana/Castelló de la Plana',
      coordinates: { lat: 36.52171152, lng: -6.28414575 },
    },
  },
};
