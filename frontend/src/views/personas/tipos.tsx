export type TipoCapacidad = 'operar' | 'administrar';

export interface Persona {
  id?: number;
  legajo: string;
  documento: string;
  nombre: string;
  apellido: string;
  email: string;
  capacidades: TipoCapacidad[];
}