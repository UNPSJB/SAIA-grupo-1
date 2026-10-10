import type{Equipo} from "../equipos/tipos";
import type { CalibracionRealizadaConID } from "../calibracion_Realizada/tipos";

export interface PlanDeCalibracion {
    nombre:string;
    equipo_id:number;
    equipo?:Equipo;
    fecha_mantenimiento:string;
    fecha_vencimiento:string;
    periodicidad_De_cambio:number | "";
    descripcion:string;
    calibraciones_realizadas?:CalibracionRealizadaConID[];
}

export interface PlanDeCalibracionConId extends PlanDeCalibracion {
    id:number;
    equipo_id:number;
    nombre_equipo?:string;
}


export interface PlanDeCalibracionForm {
    nombre:string;
    equipo_id:number | "";
    fecha_mantenimiento:string;
    periodicidad_De_cambio:number | "";
    descripcion:string | "";
}