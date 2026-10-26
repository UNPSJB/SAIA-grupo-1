import { apiFetch } from '../api/client';

export async function descargarCSV(urlEndpoint: string, nombreArchivoSugerido: string): Promise<void> {
  const res = await apiFetch(urlEndpoint);

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Error al exportar los datos a CSV.');
  }

  // Convertimos la respuesta a Blob asegurando encoding text/csv
  const blob = await res.blob();
  const urlBlob = window.URL.createObjectURL(blob);

  // Intentar obtener el nombre desde la cabecera Content-Disposition o usar el sugerido
  const disposition = res.headers.get('Content-Disposition');
  let nombreArchivo = nombreArchivoSugerido;

  if (disposition && disposition.includes('filename=')) {
    const coincidencias = disposition.match(/filename="?([^"]+)"?/);
    if (coincidencias && coincidencias[1]) {
      nombreArchivo = coincidencias[1];
    }
  }

  // Disparar la descarga en el navegador
  const link = document.createElement('a');
  link.href = urlBlob;
  link.setAttribute('download', nombreArchivo);
  document.body.appendChild(link);
  link.click();

  // Limpiar referencias
  link.parentNode?.removeChild(link);
  window.URL.revokeObjectURL(urlBlob);
}