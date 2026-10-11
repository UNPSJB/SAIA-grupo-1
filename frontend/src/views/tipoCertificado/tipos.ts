export interface TipoCertificado {
  id: number;
  nombre: string;
}

export type TipoCertificadoCreate = Omit<TipoCertificado, 'id'>;