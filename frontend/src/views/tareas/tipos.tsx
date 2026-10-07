import type { PlanDelimpieza } from "../planesDeLimpieza/tipos";
import type { Persona} from "../personas/tipos"



export interface Tarea{

    nombre:string;
    descripcion:string;
    frecuencia:string;
    plan_id:number;
    plan_de_limpieza?:PlanDelimpieza;
    personal_id:number;
    personal?:Persona

}


export interface TareaConId extends Tarea{
    id:number;
    personal_id:number;
    nombre_personal?:string;
}


export interface TareaForm{
    nombre:string;
    descripcion:string;
    plan_id:number | "";
    personal_id:number | "";
    frecuencia:string;
}