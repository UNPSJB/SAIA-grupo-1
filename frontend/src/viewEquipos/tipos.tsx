import type {PlanDelimpieza} from '../views/planesDeLimpieza/tipos'

export interface Equipo {
  nombre: string;
  categoria:string;
  ubicacion: string;
  plan_de_Limpieza?: PlanDelimpieza;
  plan_de_calibracion: string;
  estado:string;
}

export interface EquipoConId extends Equipo{

    id: number;
}