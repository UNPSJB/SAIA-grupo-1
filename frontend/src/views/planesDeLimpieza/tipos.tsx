import type {Equipo} from '../../viewEquipos/tipos'
import type {TareaConId} from '../tareas/tipos'


export interface PlanDelimpieza{
    nombre:string;
    equipo_id:number;
    equipo?:Equipo;
    tareas?:TareaConId[];
    fecha_creacion?:string;
}

export interface PlanConId extends PlanDelimpieza {
  id: number;
  equipo_id:number;
  nombre_equipo?: string;
}


export interface PlanForm {
  nombre: string;
  equipo_id:number | "";
  fecha_creacion:string;
  tareas:TareaConId[] | [];
}