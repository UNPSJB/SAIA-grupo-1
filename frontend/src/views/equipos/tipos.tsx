import type { PlanDeCalibracion } from '../planDeCalibracion/tipos';
import type {PlanDelimpieza} from '../planesDeLimpieza/tipos'

export interface Equipo {
  nombre: string;
  categoria:string;
  ubicacion: string;
  plan_de_Limpieza?: PlanDelimpieza;
  plan_de_calibracion?: PlanDeCalibracion;
  estado:string;
}

export interface EquipoConId extends Equipo{

    id: number;
}