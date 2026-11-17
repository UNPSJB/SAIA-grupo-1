export interface Proveedor {
  id: number;
  nombre: string;
  cuit?: string | null;
  contacto?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  activo: boolean;
}

export interface ProveedorForm {
  nombre: string;
  cuit: string;
  contacto: string;
  telefono: string;
  email: string;
  direccion: string;
}
