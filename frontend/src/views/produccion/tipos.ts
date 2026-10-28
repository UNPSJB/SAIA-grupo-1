/** Lo que el lote usa del producto; los productos se dan de alta en el ABM de Productos Elaborados */
export interface Producto {
  id: number;
  nombre: string;
  /** todos los lotes del producto se miden en esta unidad */
  unidadMedida: string;
  /** a un producto dado de baja no se le registran lotes, pero sus lotes viejos se siguen consultando */
  activo: boolean;
}

/** Insumo del maestro tal como se muestra dentro de un lote */
export interface InsumoResumen {
  id: number;
  nombre: string;
  /** lote del proveedor: es lo que responde "de dónde salió esto" */
  lote: string;
  medida: string;
}

/** Insumo activo con stock, para elegir en el modal de asociar */
export interface InsumoDisponible extends InsumoResumen {
  stock: number;
  fechaVencimiento: string | null;
}

/** Cuánto se usó de un insumo en el lote, en la unidad del insumo */
export interface InsumoDelLote {
  insumo: InsumoResumen;
  cantidad: number;
}

export interface LoteProduccion {
  id: number;
  codigo: string;
  producto: Producto;
  fecha: string;
  /** en la unidad de medida del producto; no se edita */
  cantidad: number;
  responsable_legajo: number;
  nombre_responsable: string;
  creado_en: string;
  /** false para los lotes de días anteriores: quedan de solo lectura */
  editable: boolean;
  insumos: InsumoDelLote[];
}

export interface LoteForm {
  /** id del producto elegido, o '' si todavía no eligió */
  producto: string;
  fecha: string;
  cantidad: number | '';
}

// Fecha de hoy en hora local (toISOString usa UTC y de noche daría la de mañana)
export const obtenerFechaLocalHoy = (): string => {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

/** "2026-10-26" → "26/10/2026" */
export const formatearFecha = (fechaIso: string): string => fechaIso.split('-').reverse().join('/');
