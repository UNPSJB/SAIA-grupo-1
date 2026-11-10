export interface DocumentoReceta {
  id: number;
  titulo: string;
  tipo: string;
}

export interface Producto {
  nombre: string;
  descripcion?: string;
  unidadMedida: string;
  id_receta?: number | null;
  nombre_receta?: string | null;
  activo: boolean;
  visible_publico?: boolean; // opcional: los formularios de alta/edicion no lo manejan
}

// lo que devuelve el catalogo de la vista publica (sin receta ni datos internos)
export interface ProductoPublico {
  id: number;
  nombre: string;
  descripcion?: string | null;
  unidadMedida: string;
}

export interface ProductoConId extends Producto {
  id: number;
}