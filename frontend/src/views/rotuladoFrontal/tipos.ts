// Espejo de backend/src/rotulado_frontal/schemas.py y constants.py

export type EstadoConjunto = 'BORRADOR' | 'PUBLICADO';
export type TipoCondicion = 'PORCENTAJE_ENERGIA' | 'CANTIDAD_POR_100' | 'MG_POR_KCAL';
export type Comparador = '>' | '>=' | '<' | '<=';
export type EstadoFisico = 'SOLIDO' | 'LIQUIDO';
export type Nutriente =
  | 'energia_kcal'
  | 'azucares_anadidos'
  | 'grasas_totales'
  | 'grasas_saturadas'
  | 'sodio_mg';

export interface CondicionUmbral {
  tipo: TipoCondicion;
  nutriente: Nutriente;
  factor_kcal?: number | null;
  comparador: Comparador;
  umbral: number;
  estado_fisico?: EstadoFisico | null;
}

export interface CondicionAplicabilidad {
  campo: Nutriente;
  comparador: Comparador;
  valor: number;
}

export interface Regla {
  codigo: string;
  leyenda: string;
  condiciones: CondicionUmbral[];
  aplicabilidad: CondicionAplicabilidad[];
  orden: number;
  activa: boolean;
}

export interface ReglaConId extends Regla {
  id: number;
}

export interface DatosConjunto {
  version: string;
  fecha_vigencia: string; // YYYY-MM-DD
  norma_origen: string;
  descripcion?: string | null;
}

export interface ConjuntoCreate extends DatosConjunto {
  reglas: Regla[];
}

export interface ConjuntoResumen extends DatosConjunto {
  id: number;
  estado: EstadoConjunto;
  basado_en_id?: number | null;
  creado_en: string;
  publicado_en?: string | null;
  es_vigente: boolean;
  cantidad_calculos: number;
}

export interface Conjunto extends ConjuntoResumen {
  reglas: ReglaConId[];
}

export interface EstadoModulo {
  clave: string;
  activo: boolean;
  actualizado_en?: string | null;
  actualizado_por_legajo?: number | null;
}

export interface ValoresNutricionales {
  energia_kcal: number;
  azucares_anadidos: number;
  grasas_totales: number;
  grasas_saturadas: number;
  sodio_mg: number;
}

export interface DetalleCondicion {
  condicion: CondicionUmbral;
  valor_calculado?: number | null;
  evaluada: boolean;
  cumple: boolean;
}

export interface ResultadoRegla {
  codigo: string;
  leyenda: string;
  aplica: boolean;
  supera: boolean;
  condiciones: DetalleCondicion[];
}

export interface PasoCalculoSello {
  criterio: string;
  codigo: string;
  tiene_agregado: string;
  calculo_realizado: string;
  umbral: string;
  estado: string;
  aplica: boolean;
  supera: boolean;
}

export interface ParametrosSellos {
  id: number;
  version: string;
  fecha_vigencia: string;
  activa: boolean;
  umbral_azucares_pct: number;
  umbral_grasas_totales_pct: number;
  umbral_grasas_saturadas_pct: number;
  umbral_sodio_mg_por_kcal: number;
  umbral_sodio_max_100g: number;
  umbral_sodio_bebida_sin_kcal: number;
  umbral_calorias_solido_100g: number;
  umbral_calorias_liquido_100ml: number;
  factor_kcal_carbohidratos: number;
  factor_kcal_grasas: number;
}

export interface Calculo {
  id: number;
  producto_id: number;
  conjunto_parametros_id: number;
  version_parametros: string;
  norma_origen: string;
  fecha_vigencia_parametros: string;
  estado_fisico: EstadoFisico;
  valores_entrada: ValoresNutricionales;
  sellos: string[];
  detalle: ResultadoRegla[];
  pasos?: PasoCalculoSello[] | null;
  calculado_en: string;
  calculado_por_legajo?: number | null;
}

// --- Textos para mostrar ---

export const NUTRIENTES: { valor: Nutriente; etiqueta: string; unidad: string }[] = [
  { valor: 'energia_kcal', etiqueta: 'Valor energético', unidad: 'kcal' },
  { valor: 'azucares_anadidos', etiqueta: 'Azúcares añadidos', unidad: 'g' },
  { valor: 'grasas_totales', etiqueta: 'Grasas totales', unidad: 'g' },
  { valor: 'grasas_saturadas', etiqueta: 'Grasas saturadas', unidad: 'g' },
  { valor: 'sodio_mg', etiqueta: 'Sodio', unidad: 'mg' },
];

export const etiquetaNutriente = (n: Nutriente): string =>
  NUTRIENTES.find((x) => x.valor === n)?.etiqueta ?? n;

export const unidadNutriente = (n: Nutriente): string =>
  NUTRIENTES.find((x) => x.valor === n)?.unidad ?? '';

export const TIPOS_CONDICION: { valor: TipoCondicion; etiqueta: string }[] = [
  { valor: 'PORCENTAJE_ENERGIA', etiqueta: '% del valor energético' },
  { valor: 'CANTIDAD_POR_100', etiqueta: 'Cantidad cada 100 g/ml' },
  { valor: 'MG_POR_KCAL', etiqueta: 'mg por kcal' },
];

export const COMPARADORES: Comparador[] = ['>=', '>', '<=', '<'];

export const SIMBOLO_COMPARADOR: Record<Comparador, string> = {
  '>': '>',
  '>=': '≥',
  '<': '<',
  '<=': '≤',
};

export const ETIQUETA_ESTADO_FISICO: Record<EstadoFisico, string> = {
  SOLIDO: 'Sólido',
  LIQUIDO: 'Líquido',
};

/** Texto legible de una condición, p. ej. "Azúcares añadidos ≥ 10 % del valor energético". */
export const describirCondicion = (c: CondicionUmbral): string => {
  const nutriente = etiquetaNutriente(c.nutriente);
  const comp = SIMBOLO_COMPARADOR[c.comparador];
  let texto: string;
  if (c.tipo === 'PORCENTAJE_ENERGIA') {
    texto = `${nutriente} ${comp} ${c.umbral} % del valor energético`;
  } else if (c.tipo === 'MG_POR_KCAL') {
    texto = `${nutriente} ${comp} ${c.umbral} mg/kcal`;
  } else {
    texto = `${nutriente} ${comp} ${c.umbral} ${unidadNutriente(c.nutriente)} cada 100 g/ml`;
  }
  if (c.estado_fisico) texto += ` (solo ${ETIQUETA_ESTADO_FISICO[c.estado_fisico].toLowerCase()}s)`;
  return texto;
};

export const unidadValorCalculado = (c: CondicionUmbral): string =>
  c.tipo === 'PORCENTAJE_ENERGIA' ? '%' : c.tipo === 'MG_POR_KCAL' ? 'mg/kcal' : unidadNutriente(c.nutriente);

/** Misma regla que el backend: g/kg es sólido, ml/l es líquido, el resto hay que indicarlo. */
export const estadoFisicoPorUnidad = (unidad: string | undefined | null): EstadoFisico | null => {
  const u = (unidad || '').toLowerCase();
  if (u === 'gramos' || u === 'kilogramos') return 'SOLIDO';
  if (u === 'mililitros' || u === 'litros') return 'LIQUIDO';
  return null;
};

/** `sellos` trae códigos; la leyenda para el octógono sale del detalle de las reglas que superan. */
export const leyendasDeSellos = (r: { sellos: string[]; detalle: ResultadoRegla[] }): string[] =>
  r.sellos.map((codigo) => r.detalle.find((d) => d.codigo === codigo)?.leyenda ?? codigo.replace(/_/g, ' '));

export const formatearFecha =(iso: string | null | undefined): string => {
  if (!iso) return '—';
  // las fechas sin hora (YYYY-MM-DD) se muestran tal cual para no correrlas por zona horaria
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [a, m, d] = iso.split('-');
    return `${d}/${m}/${a}`;
  }
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? iso : fecha.toLocaleString('es-AR');
};
