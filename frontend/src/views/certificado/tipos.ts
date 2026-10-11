export interface Certificado {
  id: number;
  tipo: string;
  fechaVencimiento: string;
  legajo_persona: number;
  foto_url?: string | null;
}

export type CertificadoCreate = Omit<Certificado, 'id'>
export type CertificadoUpdate = Omit<CertificadoCreate, 'legajo_persona'>