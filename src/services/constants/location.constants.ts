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
 * Coordenadas de las capitales de provincia
 */
export const PROVINCIAL_CAPITALS: { [provinceCode: string]: { lat: number; lng: number } } = {
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

/**
 * Nombres de las capitales de provincia
 */
export const CAPITAL_NAMES: { [code: string]: string } = {
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
