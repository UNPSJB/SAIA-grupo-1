export type FormatoDeclaracionAditivos =
  | 'ins_y_nombre'
  | 'nombre_e_ins'
  | 'solo_ins'
  | 'solo_nombre';

export interface ItemIngrediente {
  id?: number;
  orden?: number;
  nombre: string;
  denominacion_rotulo?: string | null;
  porcentaje: number;
  es_aditivo: boolean;
  funcion?: string | null;
  numero_ins?: string | null;
  es_aromatizante?: boolean;
  texto_declaracion?: string | null;
}

export interface ListaIngredientesRotuloResponse {
  id: number;
  producto_id: number;
  producto_nombre: string;
  formato_aditivos: FormatoDeclaracionAditivos;
  ajustado_manualmente: boolean;
  fecha_ajuste_manual?: string | null;
  usuario_ajuste_manual?: string | null;
  texto_rotulo?: string | null;
  actualizado_el: string;
  items: ItemIngrediente[];
}

export interface PrevisualizarOrdenResponse {
  formato_aditivos: FormatoDeclaracionAditivos;
  texto_rotulo: string;
  items: ItemIngrediente[];
}

