import type { Equipo } from '../equipos/tipos';
import type { Sector } from '../sectores/tipos';
import type { TareaConId } from '../tareas/tipos';

export interface PlanDelimpieza {
  nombre: string;
  equipo_id?: number | null;
  sector_id?: number | null;
  equipo?: Equipo;
  sector?: Sector;
  tareas?: TareaConId[];
  fecha_inicio?: string;
}

export interface PlanConId extends PlanDelimpieza {
  id: number;
  equipo_id?: number | null;
  sector_id?: number | null;
  nombre_equipo?: string | null;
  nombre_sector?: string | null;
}

export interface PlanForm {
  nombre: string;
  tipo_objetivo: 'equipo' | 'sector';
  equipo_id: number | '';
  sector_id: number | '';
  fecha_inicio: string;
  tareas: TareaConId[];
}