import type { PlanDelimpieza } from "../planesDeLimpieza/tipos";



export interface Tarea{

    nombre:string;
    descripcion:string;
    frecuencia:string;
    plan_id:number;
    personal_id:number | "";
    nombre_personal?:string | null;
    plan_de_limpieza?:PlanDelimpieza

}


export interface TareaConId extends Tarea{
    id:number;
}


export interface TareaForm{
    nombre:string;
    descripcion:string;
    plan_id:number | "";
    frecuencia:string;
    personal_id:number | "";
}