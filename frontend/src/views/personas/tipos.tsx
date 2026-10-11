
export interface Persona {
  legajo: number;
  /** lo genera el servidor al crear la persona (nombre.apellido); no se edita */
  usuario: string;
  nombre: string;
  apellido: string;
  documento: number | string;
  dni?: number | string;
  email: string;
  activo: boolean;
  capacidad: "OPERAR" | "ADMINISTRAR" | "AMBAS";
  tareas?:{ id:number; nombre:string }[];
}

export interface PersonaCrear {
  nombre: string;
  apellido: string;
  documento: number | string;
  email: string;
  activo?: boolean;
  capacidad: "OPERAR" | "ADMINISTRAR" | "AMBAS";
  contrasenia: string;
}

export interface PersonaActualizar {
  nombre?: string;
  apellido?: string;
  documento?: number | string;
  email?: string;
  activo?: boolean;
  capacidad?: "OPERAR" | "ADMINISTRAR" | "AMBAS";
  /** solo se envía si se quiere cambiar; vacío = no tocar la contraseña actual */
  contrasenia?: string;
}