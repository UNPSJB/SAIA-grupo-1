import type { PlanDeCalibracion } from '../planDeCalibracion/tipos';
import type { PlanDelimpieza } from '../planesDeLimpieza/tipos';
import type { Sector } from '../sectores/tipos';

export interface Equipo {
  nombre: string;
  categoria: string;
  sector_id: number | '';
  ubicacion?: Sector;
  plan_de_Limpieza?: PlanDelimpieza;
  plan_de_calibracion?: PlanDeCalibracion;
  estado: string;
}

export interface EquipoConId extends Equipo {
  id: number;
}