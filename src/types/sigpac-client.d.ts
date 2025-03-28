declare module 'sigpac-client' {
  export function localizacion(
    capa: string,
    coords: { lng: number; lat: number },
    config?: { transformCoords?: boolean; projection?: string; proxy?: boolean },
  ): Promise<any>;

  export function buscar(
    data: {
      comunidad?: number;
      provincia?: number;
      municipio?: number;
      poligono?: number;
      parcela?: number;
    },
    config?: { proxy?: boolean },
  ): Promise<any>;

  export function consulta(capa: string, data: any, config?: { proxy?: boolean }): Promise<any>;
}
