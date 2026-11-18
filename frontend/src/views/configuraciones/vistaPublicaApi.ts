import { apiFetch } from '../../api/client';

/** Estado de la vista pública tal como lo guarda el backend (GET /configuracion/vista-publica). */
export interface EstadoVistaPublica {
  habilitada: boolean;
  id_alfanumerico: string | null;
  urldelQR: string | null;
  ver_grafico: boolean;
  verAcercaDeNosotros: boolean;
  verProductos: boolean;
  ver_dias_sin_incidentes: boolean;
  ver_total_lotes: boolean;
  ver_volumen_fabricado: boolean;
  ver_producto_mas_elaborado: boolean;
  ver_grafico_totales_productos: boolean;
  ver_grafico_red_arana: boolean;
}

export type ParametrosVistaPublica = Partial<
  Pick<
    EstadoVistaPublica,
    | 'ver_grafico'
    | 'verAcercaDeNosotros'
    | 'verProductos'
    | 'ver_dias_sin_incidentes'
    | 'ver_total_lotes'
    | 'ver_volumen_fabricado'
    | 'ver_producto_mas_elaborado'
    | 'ver_grafico_totales_productos'
    | 'ver_grafico_red_arana'
  >
> & {
  habilitada?: false;
};

async function leerError(res: Response, porDefecto: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.detail)) return data.detail.map((e: { msg?: string }) => e.msg ?? '').join(', ');
  return porDefecto;
}

export async function obtenerEstadoVistaPublica(): Promise<EstadoVistaPublica> {
  const res = await apiFetch('/configuracion/vista-publica');
  if (!res.ok) throw new Error(await leerError(res, 'No se pudo obtener el estado de la vista pública.'));
  return res.json();
}

export async function actualizarVistaPublica(cambios: ParametrosVistaPublica): Promise<EstadoVistaPublica> {
  const res = await apiFetch('/configuracion/vista-publica', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cambios),
  });
  if (!res.ok) throw new Error(await leerError(res, 'No se pudo actualizar la vista pública.'));
  return res.json();
}

/** Enlace que abre la vista pública (el mismo que codifica el QR). */
export function enlaceVistaPublica(estado: EstadoVistaPublica): string | null {
  if (!estado.habilitada || !estado.id_alfanumerico) return null;
  return `${window.location.origin}/vista-publica/${estado.id_alfanumerico}?verGrafico=${estado.ver_grafico}&verAcercaDeNosotros=${estado.verAcercaDeNosotros}`;
}
