export type TipoDocumento = "MANUAL_BPM" | "FICHA_TECNICA" | "PROCEDIMIENTO" | "RECETA";

export interface DocumentoListItem {
  id: number;
  titulo: string;
  tipo: TipoDocumento;
  descripcion: string | null;
  activo: boolean;
  creado_el: string;
  version_actual: number | null;
  version_actual_id: number | null;
  fecha_subida_actual: string | null;
  archivo_nombre_original: string | null;
  es_vigente: boolean;
  fecha_vigencia: string | null;
  total_versiones: number;
}

export interface VersionItem {
  id: number;
  documento_id: number;
  version: number;
  archivo_nombre_original: string;
  tamanio_bytes: number;
  archivado: boolean;
  es_vigente: boolean;
  fecha_vigencia: string | null;
  creado_el: string;
  url_descarga: string | null;
}

export interface DocumentoDetalle {
  id: number;
  titulo: string;
  tipo: TipoDocumento;
  descripcion: string | null;
  activo: boolean;
  creado_el: string;
  version_actual: VersionItem | null;
  version_vigente: VersionItem | null;
  total_versiones: number;
}
