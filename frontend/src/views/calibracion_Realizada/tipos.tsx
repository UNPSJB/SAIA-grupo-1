import type { PlanDeCalibracion } from "../planDeCalibracion/tipos";



export interface CalibracionRealizada{
    plan_calibracion_id:number;
    plan_calibracion?:PlanDeCalibracion
    fecha_d_realizacion:string;
    formato_archivo:string
}


export interface CalibracionRealizadaConID extends CalibracionRealizada{
    id:number
    plan_calibracion_id:number
    nombre_plan_calibracion?:string
}


export interface CalibracionRealizadaForm{
    plan_calibracion_id:number|"";
    fecha_d_realizacion:string;
    formato_archivo:string
}