export type TipoControlAmbiental = 'CONTROL_PLAGAS' | 'ANALISIS_AGUA' | 'LIMPIEZA_TANQUE' | string;

export interface VisitaControl {
  id: number;
  control_id: number;
  fecha_realizacion: string;
  fecha_proximo_vencimiento: string;
  certificado_url: string | null;
  observaciones: string | null;
  creado_el: string;
}

export interface ControlAmbiental {
  id: number;
  tipo: TipoControlAmbiental;
  periodicidad_dias: number;
  activo: boolean;
  ultima_fecha_realizacion: string | null;
  fecha_vencimiento: string | null;
  observaciones: string | null;
  creado_el: string;
  ultima_visita: VisitaControl | null;
}

export interface ControlAmbientalConHistorial extends ControlAmbiental {
  visitas: VisitaControl[];
}