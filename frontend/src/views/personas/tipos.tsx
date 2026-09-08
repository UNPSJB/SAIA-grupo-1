export type TipoCapacidad = 'operar' | 'administrar';

export interface Persona {
  legajo: number; // PK autoincremental única
  documento: string;
  nombre: string;
  apellido: string;
  email: string;
  capacidades: TipoCapacidad[];
}

// Datos que viajan al backend al dar de alta (sin legajo)
export type PersonaCreate = Omit<Persona, 'legajo'>;