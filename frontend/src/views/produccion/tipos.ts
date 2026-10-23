// Mismos valores que el enum UnidadMedida del backend (src/insumos/models.py)
export const UNIDADES_MEDIDA = ['kilogramos', 'gramos', 'litros', 'mililitros', 'unidades'] as const;

export const NOMBRE_PRODUCTO_MAX = 100;

export interface Producto {
  id: number;
  nombre: string;
}

export interface LoteProduccion {
  id: number;
  codigo: string;
  producto: Producto;
  fecha: string;
  cantidad: number;
  unidad_medida: string;
  responsable_legajo: number;
  nombre_responsable: string;
  creado_en: string;
}

export interface LoteForm {
  /** id del producto elegido, o NUEVO_PRODUCTO si se va a crear uno, o '' si todavía no eligió */
  producto: string;
  productoNuevo: string;
  fecha: string;
  cantidad: number | '';
  unidad_medida: string;
}

/** Valor del selector que representa "Crear producto nuevo…" */
export const NUEVO_PRODUCTO = '__nuevo__';
