export type ClaseFuncional =
  | 'Conservante'
  | 'Antioxidante'
  | 'Colorante'
  | 'Edulcorante'
  | 'Aromatizante'
  | 'Leudante químico'
  | 'Emulsionante'
  | 'Acidulante'
  | 'Estabilizante'
  | 'Espesante'
  | 'Humectante'
  | 'Regulador de acidez'
  | 'Potenciador de sabor'
  | 'Estimulante'
  | 'conservante'
  | 'antioxidante'
  | 'colorante'
  | 'edulcorantes'
  | string;

export type EstadoEtapaRecetaItem =
  | 'pendiente'
  | 'realizado'
  | 'no_realizado'
  | 'vencido';

export type MotivoNoRealizadoReceta =
  | 'equipo_fuera_de_uso'
  | 'falta_de_insumo'
  | 'otro'
  | string;

export type EstadoGeneralRecetaChecklist =
  | 'pendiente'
  | 'completado'
  | 'vencido';

export interface RecetaDetalle {
  tipo_insumo_id?: number | null;
  nombre: string;
  cantidad: number;
  unidad_medida: string;
  es_aditivo: boolean;
  clase_funcional?: ClaseFuncional | null;
  numero_ins?: string | null;
  descripcion_pasos: string;
  nombre_ingrediente?: string | null;
}

export interface RecetaDetalleConId extends RecetaDetalle {
  id: number;
  version_receta_id: number;
}

export interface RecetaDetalleForm {
  tipo_insumo_id: number | '';
  nombre: string;
  cantidad: number | '';
  unidad_medida: string;
  es_aditivo: boolean;
  clase_funcional: ClaseFuncional | '';
  numero_ins: string;
  descripcion_pasos: string;
}

export interface VersionRecetaItem {
  id: number;
  receta_id: number;
  version: number;
  rendimiento_final: number;
  archivado: boolean;
  es_vigente: boolean;
  fecha_vigencia: string | null;
  fecha_vencimiento?: string | null;
  usuario?: string | null;
  creado_el: string;
  detalles?: RecetaDetalleConId[] | null;
}

export interface Receta {
  nombre: string;
  rendimiento_final: number;
  id_producto: number;
  operario_legajo: number;
  nombre_producto?: string | null;
  nombre_operario?: string | null;
  fecha_creacion?: string;
  fecha_vigencia?: string | null;
  fecha_vencimiento?: string | null;
  activo?: boolean;
  version_actual?: VersionRecetaItem | null;
  version_vigente?: VersionRecetaItem | null;
  detalles?: RecetaDetalleConId[];
}

export interface RecetaConId extends Receta {
  id: number;
  activo: boolean;
}

export interface RecetaForm {
  nombre: string;
  rendimiento_final: number | '';
  id_producto: number | '';
  operario_legajo: number | '';
  fecha_creacion: string;
  fecha_vigencia: string;
  fecha_vencimiento: string;
  detalles: RecetaDetalleConId[];
}

export interface ChecklistRecetaItem {
  id: number;
  checklist_id: number;
  receta_id?: number | null;
  version_receta_id?: number | null;
  nombre_receta: string;
  detalle_id?: number | null;
  nombre_etapa: string;
  descripcion_pasos: string;
  ingrediente_id?: number | null;
  tipo_insumo_id?: number | null;
  nombre_ingrediente?: string | null;
  cantidad: number;
  unidad_medida: string;
  estado: EstadoEtapaRecetaItem;
  responsable_legajo?: number | null;
  nombre_responsable?: string | null;
  observaciones?: string | null;
  fecha_hora_fin?: string | null;
  motivo_no_realizado?: MotivoNoRealizadoReceta | null;
  observacion_no_realizado?: string | null;
  fecha_hora_no_realizado?: string | null;
}

export interface ChecklistReceta {
  id: number;
  fecha: string;
  creado_en: string;
  activo: boolean;
  responsable_legajo: number;
  nombre_responsable?: string | null;
  estado: EstadoGeneralRecetaChecklist;
  porcentaje_cumplimiento: number;
  total_etapas: number;
  etapas_completadas: number;
  etapas_no_realizadas?: number;
  etapas_pendientes: number;
  etapas_vencidas?: number;
  items: ChecklistRecetaItem[];
}

export interface PersonalResumen {
  legajo: number;
  nombre: string;
  apellido: string;
  activo: boolean;
  capacidad?: 'OPERAR' | 'ADMINISTRAR' | 'AMBAS';
}

export interface ChecklistRecetaGenerarPayload {
  fecha?: string;
}

export interface CompletarEtapaPayload {
  observaciones?: string;
}

export interface MarcarEtapaNoRealizadaPayload {
  motivo: MotivoNoRealizadoReceta;
  observacion?: string;
}