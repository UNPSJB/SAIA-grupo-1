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
}

export interface ProductoConId extends Producto {
  id: number;
}