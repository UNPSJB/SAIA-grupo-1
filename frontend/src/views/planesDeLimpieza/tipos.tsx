import type {Equipo} from '../equipos/tipos'
import type {TareaConId} from '../tareas/tipos'


export interface PlanDelimpieza{
    nombre:string;
    equipo_id:number;
    equipo?:Equipo;
    tareas?:TareaConId[];
    fecha_inicio?:string;
}

export interface PlanConId extends PlanDelimpieza {
  id: number;
  equipo_id:number;
  nombre_equipo?: string;
}


export interface PlanForm {
  nombre: string;
  equipo_id:number | "";
  fecha_inicio:string;
  tareas:TareaConId[] | [];
}