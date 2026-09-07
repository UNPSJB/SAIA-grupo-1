export type TipoCapacidad = 'operar' | 'administrar';

export interface Persona {
  legajo?: number;
  documento: string;
  nombre: string;
  apellido: string;
  email: string;
  capacidades: TipoCapacidad[];
}

export type PersonaCreate = Omit<Persona, 'legajo'>;