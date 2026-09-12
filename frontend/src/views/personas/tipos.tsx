export type TipoCapacidad = 'operar' | 'administrar' | 'ambas';

export interface Persona {
  legajo: number;
  documento: string;
  nombre: string;
  apellido: string;
  email: string;
  capacidad: TipoCapacidad;
  activo : boolean;
}

export type PersonaCreate = Omit<Persona, 'legajo'>;
export type PersonaUpdate = Partial<PersonaCreate>;