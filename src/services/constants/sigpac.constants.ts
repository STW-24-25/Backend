export const BASE_SIGPAC_URL = 'https://sigpac-hubcloud.es';
export const CODES_SIGPAC_URL = `${BASE_SIGPAC_URL}/codigossigpac`;
export const USO_SIGPAC_URL = `${CODES_SIGPAC_URL}/cod_uso_sigpac.json`;
export const getMunicSigpacUrl = (municipioCode: number): string => {
  return `${CODES_SIGPAC_URL}/municipio${municipioCode}.json`;
};
export const getGeoJSONSigpacUrl = (lng: number, lat: number): string => {
  return `${BASE_SIGPAC_URL}/servicioconsultassigpac/query/recinfobypoint/4258/${lng}/${lat}.geojson`;
};

export const VALID_SIGPAC_USES = [
  'CF',
  'CI',
  'CO',
  'CS',
  'CV',
  'FF',
  'FL',
  'FO',
  'FS',
  'FV',
  'FY',
  'IM',
  'IV',
  'OC',
  'OF',
  'OP',
  'OV',
  'PA',
  'PR',
  'PS',
  'TA',
  'TH',
  'VF',
  'VI',
  'VO',
];
