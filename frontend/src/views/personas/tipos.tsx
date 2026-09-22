export interface Persona {
  legajo: number;
  nombre: string;
  apellido: string;
  documento: number | string;
  dni?: number | string;
  email: string;
  activo: boolean;
  capacidad: "OPERAR" | "MANTENIMIENTO" | "AMBAS";
}

export interface PersonaCrear {
  nombre: string;
  apellido: string;
  documento: number | string;
  email: string;
  activo?: boolean;
  capacidad: "OPERAR" | "MANTENIMIENTO" | "AMBAS";
}

export interface PersonaActualizar {
  nombre?: string;
  apellido?: string;
  documento?: number | string;
  email?: string;
  activo?: boolean;
  capacidad?: "OPERAR" | "MANTENIMIENTO" | "AMBAS";
}