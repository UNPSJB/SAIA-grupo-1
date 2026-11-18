import io
from typing import Any, Dict, List
from fastapi import Response
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generar_respuesta_pdf(
    datos: List[Dict[str, Any]],
    columnas: Dict[str, str],
    titulo_reporte: str = "Reporte de Datos",
    nombre_archivo: str = "reporte.pdf",
) -> Response:
    """
    Genera un PDF tabular reutilizable y elegante en orientación horizontal.
    - datos: Lista de diccionarios con la información.
    - columnas: Mapping {clave_dict: "Nombre Columna en PDF"}.
    """
    buffer = io.BytesIO()
    
    # Documento A4 apaisado para dar buen margen a las columnas
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=30,
        rightMargin=30,
        topMargin=30,
        bottomMargin=30,
    )
    
    elements = []
    styles = getSampleStyleSheet()

    # Estilos del título
    titulo_style = ParagraphStyle(
        'TituloReporte',
        parent=styles['Heading1'],
        fontSize=16,
        leading=20,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=15
    )
    elements.append(Paragraph(titulo_reporte, titulo_style))
    elements.append(Spacer(1, 10))

    # Construcción de la tabla
    headers_keys = list(columnas.keys())
    headers_labels = list(columnas.values())

    # Estilos para celdas de texto
    header_style = ParagraphStyle(
        'HeaderStyle',
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.white,
    )

    cell_style = ParagraphStyle(
        'CellStyle',
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#1e293b'),
    )

    # 1. Fila de Encabezados
    tabla_datos = [[Paragraph(label, header_style) for label in headers_labels]]

    # 2. Filas de Datos
    for fila in datos:
        row = []
        for key in headers_keys:
            val = str(fila.get(key, '')) if fila.get(key) is not None else '—'
            row.append(Paragraph(val, cell_style))
        tabla_datos.append(row)

    # Crear tabla con ancho automático repartido
    t = Table(tabla_datos, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
    ]))

    elements.append(t)
    doc.build(elements)

    pdf_value = buffer.getvalue()
    buffer.close()

    headers = {
        "Content-Disposition": f'attachment; filename="{nombre_archivo}"',
        "Access-Control-Expose-Headers": "Content-Disposition",
    }

    return Response(
        content=pdf_value,
        media_type="application/pdf",
        headers=headers,
    )