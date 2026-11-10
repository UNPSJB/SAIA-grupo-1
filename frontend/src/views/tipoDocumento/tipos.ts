export interface TipoDocumento {
  id: number;
  nombre: string;
}

export type TipoDocumentoCreate = Omit<TipoDocumento, 'id'>;

