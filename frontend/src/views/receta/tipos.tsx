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

export type CondicionUmbral = 'RANGO' | 'MENOR_QUE' | 'MAYOR_QUE' | 'EXACTO';

export interface ParametroControlReceta {
  nombre_dato: string;
  unidad_medida?: string | null;
  condicion?: CondicionUmbral | string;
  umbral_minimo?: number | null;
  umbral_maximo?: number | null;
  requerimientos?: string | null;
}

export interface ValorControlRegistrado {
  nombre_dato: string;
  unidad_medida?: string | null;
  condicion?: CondicionUmbral | string | null;
  valor_registrado: string;
  umbral_minimo?: number | null;
  umbral_maximo?: number | null;
  cumple_umbral: boolean;
}

export const ETAPAS_PREDEFINIDAS = [
  'Preparación',
  'Amasado',
  'Fermentación',
  'Armado',
  'Cocción',
  'Enfriado',
  'Terminación',
  'Guardado',
];

const FACTORES_MASA_G: Record<string, number> = {
  mg: 0.001,
  miligramo: 0.001,
  miligramos: 0.001,
  g: 1,
  gr: 1,
  gramo: 1,
  gramos: 1,
  kg: 1000,
  kilogramo: 1000,
  kilogramos: 1000,
  tn: 1000000,
  tonelada: 1000000,
  toneladas: 1000000,
};

const FACTORES_VOLUMEN_ML: Record<string, number> = {
  ml: 1,
  cc: 1,
  mililitro: 1,
  mililitros: 1,
  l: 1000,
  lt: 1000,
  litro: 1000,
  litros: 1000,
};

export function convertirEntreUnidades(
  cantidad: number,
  uOrigen?: string | null,
  uDestino?: string | null
): number {
  const orig = (uOrigen || '').trim().toLowerCase();
  const dest = (uDestino || '').trim().toLowerCase();
  if (!orig || !dest || orig === dest) return cantidad;
  if (orig in FACTORES_MASA_G && dest in FACTORES_MASA_G) {
    return cantidad * (FACTORES_MASA_G[orig] / FACTORES_MASA_G[dest]);
  }
  if (orig in FACTORES_VOLUMEN_ML && dest in FACTORES_VOLUMEN_ML) {
    return cantidad * (FACTORES_VOLUMEN_ML[orig] / FACTORES_VOLUMEN_ML[dest]);
  }
  return cantidad;
}

export function formatearReglaUmbral(p: ParametroControlReceta): string {
  const u = p.unidad_medida ? ` ${p.unidad_medida}` : '';
  const cond = (p.condicion || 'RANGO').toUpperCase();
  if (cond === 'MENOR_QUE' && p.umbral_maximo != null) {
    return `Por debajo de ${p.umbral_maximo}${u}`;
  }
  if (cond === 'MAYOR_QUE' && p.umbral_minimo != null) {
    return `Por arriba de ${p.umbral_minimo}${u}`;
  }
  if (cond === 'EXACTO' && (p.umbral_minimo != null || p.umbral_maximo != null)) {
    const val = p.umbral_minimo ?? p.umbral_maximo;
    return `Valor exacto: ${val}${u}`;
  }
  if (p.umbral_minimo != null && p.umbral_maximo != null) {
    return `Entre ${p.umbral_minimo} y ${p.umbral_maximo}${u}`;
  }
  if (p.umbral_minimo != null) {
    return `Mínimo ${p.umbral_minimo}${u}`;
  }
  if (p.umbral_maximo != null) {
    return `Máximo ${p.umbral_maximo}${u}`;
  }
  return p.requerimientos || 'Registrar valor';
}

export function evaluarUmbral(p: ParametroControlReceta, valorNumerico: number): boolean {
  if (Number.isNaN(valorNumerico)) return false;
  const cond = (p.condicion || 'RANGO').toUpperCase();
  if (cond === 'MENOR_QUE' && p.umbral_maximo != null) {
    return valorNumerico <= p.umbral_maximo;
  }
  if (cond === 'MAYOR_QUE' && p.umbral_minimo != null) {
    return valorNumerico >= p.umbral_minimo;
  }
  if (cond === 'EXACTO') {
    const obj = p.umbral_minimo ?? p.umbral_maximo;
    if (obj == null) return true;
    return Math.abs(valorNumerico - obj) <= 1e-6;
  }
  if (p.umbral_minimo != null && valorNumerico < p.umbral_minimo) return false;
  if (p.umbral_maximo != null && valorNumerico > p.umbral_maximo) return false;
  return true;
}

export interface RecetaDetalle {
  etapa?: string | null;
  tipo_insumo_id?: number | null;
  nombre: string;
  cantidad: number;
  unidad_medida: string;
  es_aditivo: boolean;
  clase_funcional?: ClaseFuncional | null;
  numero_ins?: string | null;
  descripcion_pasos: string;
  nombre_ingrediente?: string | null;
  parametros_control?: ParametroControlReceta[];
}

export interface RecetaDetalleConId extends RecetaDetalle {
  id: number;
  version_receta_id: number;
}

export interface RecetaDetalleForm {
  etapa: string;
  tipo_insumo_id: number | '';
  nombre: string;
  cantidad: number | '';
  unidad_medida: string;
  es_aditivo: boolean;
  clase_funcional: ClaseFuncional | '';
  numero_ins: string;
  descripcion_pasos: string;
  parametros_control: ParametroControlReceta[];
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

export interface LoteInsumoUsadoInput {
  lote_insumo_id: number;
  cantidad: number;
}

export interface LoteInsumoUsadoItem {
  lote_insumo_id: number;
  lote_codigo?: string | null;
  nombre?: string | null;
  cantidad: number;
}

export interface ChecklistRecetaItem {
  id: number;
  checklist_id: number;
  receta_id?: number | null;
  version_receta_id?: number | null;
  nombre_receta: string;
  detalle_id?: number | null;
  etapa?: string | null;
  nombre_etapa: string;
  descripcion_pasos: string;
  ingrediente_id?: number | null;
  tipo_insumo_id?: number | null;
  lote_insumo_usado_id?: number | null;
  lotes_insumo_usados?: LoteInsumoUsadoItem[];
  nombre_ingrediente?: string | null;
  cantidad: number;
  unidad_medida: string;
  parametros_control?: ParametroControlReceta[];
  valores_registrados?: ValorControlRegistrado[];
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
  lote_insumo_id?: number;
  lotes_insumo?: LoteInsumoUsadoInput[];
  valores_control?: ValorControlRegistrado[];
}

export interface MarcarEtapaNoRealizadaPayload {
  motivo: MotivoNoRealizadoReceta;
  observacion?: string;
}