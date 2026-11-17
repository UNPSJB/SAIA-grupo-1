export interface DocumentoReceta {
  id: number;
  titulo: string;
  tipo: string;
}

export interface Producto {
  nombre: string;
  descripcion?: string;
  unidad_medida_id?: number | null;
  unidadMedida: string;
  unidad_medida_nombre?: string | null;
  unidad_medida_abreviatura?: string | null;
  id_receta?: number | null;
  nombre_receta?: string | null;
  activo: boolean;
  visible_publico?: boolean;
}

export interface ProductoPublico {
  id: number;
  nombre: string;
  descripcion?: string | null;
  unidadMedida: string;
  unidad_medida_abreviatura?: string | null;
}

export interface ProductoConId extends Producto {
  id: number;
}