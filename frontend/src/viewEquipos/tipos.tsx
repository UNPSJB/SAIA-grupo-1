export interface Equipo {
  nombre: string;
  categoria:string;
  ubicacion: string;
  plan_de_Limpieza: string;
  plan_de_calibracion: string;
  estado:string;
}

export interface EquipoConId extends Equipo{

    id: number;
}