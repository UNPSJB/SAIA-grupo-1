import csv
import io
from typing import Any, Dict, List
from fastapi.responses import StreamingResponse


def generar_respuesta_csv(
    datos: List[Dict[str, Any]],
    columnas: Dict[str, str],
    nombre_archivo: str = "reporte.csv",
) -> StreamingResponse:
  """Genera una StreamingResponse con formato CSV en UTF-8 con BOM (utf-8-sig).

  - datos: Lista de diccionarios con la información a exportar.
  - columnas: Diccionario que mapea la clave del dict con el encabezado legible
  (ej: {"nombre": "Nombre del Producto", "unidadMedida": "Unidad"}).
  - nombre_archivo: Nombre sugerido para la descarga.
  """
  output = io.StringIO()

  # Escribimos el BOM de UTF-8 manualmente en el buffer
  output.write("\ufeff")

  writer = csv.DictWriter(
      output,
      fieldnames=list(columnas.keys()),
      extrasaction="ignore",
      quoting=csv.QUOTE_MINIMAL,
  )

  # Escribir fila de encabezados formateada
  writer.writerow(columnas)

  # Escribir las filas de datos
  for fila in datos:
    writer.writerow(fila)

  # Resetear el cursor del buffer
  output.seek(0)

  headers = {
      "Content-Disposition": f'attachment; filename="{nombre_archivo}"',
      "Access-Control-Expose-Headers": "Content-Disposition",
  }

  return StreamingResponse(
      io.BytesIO(output.getvalue().encode("utf-8-sig")),
      media_type="text/csv; charset=utf-8-sig",
      headers=headers,
  )