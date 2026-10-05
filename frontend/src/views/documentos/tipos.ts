export type TipoDocumento = "MANUAL_BPM" | "FICHA_TECNICA" | "PROCEDIMIENTO" | "RECETA";

export interface DocumentoListItem {
  id: number;
  titulo: string;
  tipo: TipoDocumento;
  descripcion: string | null;
  activo: boolean;
  creado_el: string;
  version_actual: string | null;
  version_actual_id: number | null;
  fecha_subida_actual: string | null;
  responsable_nombre: string | null;
  responsable_legajo: number | null;
  archivo_nombre_original: string | null;
  total_versiones: number;
}

export interface PersonalAdmin {
  legajo: number;
  nombre: string;
  apellido: string;
  documento?: number;
  capacidad: string;
  activo: boolean;
}
