export type TipoLetraPdf = "Serif" | "Sans_serif" | "Slab_serif" | "Helvetica";

export interface ConfiguracionPdf {
  id?: number;
  encabezado: string | null;
  logo: string | null;
  pie_dePagina: string | null;
  tipo_letra: string | null;
}

export interface ConfiguracionPdfUpdate {
  encabezado?: string | null;
  logo?: string | null;
  pie_dePagina?: string | null;
  tipo_letra?: string | null;
}