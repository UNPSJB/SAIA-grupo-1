export type AccionAuditoria = "CREAR" | "MODIFICAR" | "ELIMINAR" | "crear" | "modificar" | "eliminar" | string;

export interface Auditoria {
  id: number;
  tabla: string;
  registro_id: number;
  accion: AccionAuditoria;
  campo?: string | null;
  valor_previo?: string | null;
  valor_posterior?: string | null;
  creado_el: string;
}
