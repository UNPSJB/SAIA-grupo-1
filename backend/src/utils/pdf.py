import io
import os
import shutil
from pathlib import Path
from typing import Any, Dict, List, Optional

import urllib.request
from fastapi import Response, UploadFile
from src.utils import exceptions
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models, schemas

EXTENSIONES_LOGO_VALIDAS = {".png", ".jpg", ".jpeg"}
CONTENT_TYPES_LOGO_VALIDOS = {"image/png", "image/jpeg"}
LOGOS_DIR = Path("archivos/logos")


def _cargar_imagen_logo(logo: Optional[str]):
    if not logo:
        return None

    valor = logo.strip()
    if valor.startswith(("http://", "https://")):
        req = urllib.request.Request(valor, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            return ImageReader(io.BytesIO(resp.read()))

    ruta_relativa = valor.lstrip("/")
    posibles_rutas = [
        Path(valor),
        Path(ruta_relativa),
        LOGOS_DIR / Path(valor).name,
    ]
    for ruta in posibles_rutas:
        if ruta.is_file():
            return ImageReader(str(ruta))

    return None


def guardar_logo_pdf(db: Session, archivo_logo: UploadFile) -> models.PD_EFE:
    nombre_seguro = Path(archivo_logo.filename or "").name
    extension = Path(nombre_seguro).suffix.lower()
    content_type = (archivo_logo.content_type or "").lower()

    if extension not in EXTENSIONES_LOGO_VALIDAS or content_type not in CONTENT_TYPES_LOGO_VALIDOS:
        raise exceptions.NoPermitido()

    LOGOS_DIR.mkdir(parents=True, exist_ok=True)
    ext_final = ".jpg" if extension == ".jpeg" else extension
    nombre_final = f"logo_empresa{ext_final}"
    ruta_destino = LOGOS_DIR / nombre_final

    try:
        with open(ruta_destino, "wb") as buffer:
            shutil.copyfileobj(archivo_logo.file, buffer)
    finally:
        archivo_logo.file.close()

    url_logo = f"/pdfs/logos/{nombre_final}"

    config = _obtener_o_crear_config_pdf(db)
    config.logo = url_logo
    db.commit()
    db.refresh(config)
    return config

def _obtener_o_crear_config_pdf(db: Session) -> models.PD_EFE:
    config = db.scalar(select(models.PD_EFE).where(models.PD_EFE.id == 1))
    if config is None:
        config = models.PD_EFE(
            id=1,
            encabezado="Encabezado",
            logo="Logo",
            pie_dePagina="Pie de pagina",
            tipo_letra="Helvetica",
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    return config



def _resolver_fuente_reportlab(tipo_letra: Optional[str]) -> tuple[str, str]:
    """
    Mapea el tipo de letra configurado por el admin a fuentes estándar de ReportLab.
    Retorna (fuente_regular, fuente_negrita).
    """
    if not tipo_letra:
        return ("Helvetica", "Helvetica-Bold")

    valor = tipo_letra.strip().lower()
    if "serif" in valor and "sans" not in valor and "slab" not in valor:
        return ("Times-Roman", "Times-Bold")
    if "slab" in valor:
        return ("Courier", "Courier-Bold")
    return ("Helvetica", "Helvetica-Bold")

def generar_respuesta_pdf(
    db: Session,
    datos: List[Dict[str, Any]],
    columnas: Dict[str, str],
    titulo_reporte: str = "Reporte de Datos",
    nombre_archivo: str = "reporte.pdf",
    encabezado: Optional[str] = None,
    pie_de_pagina: Optional[str] = None,
    logo: Optional[str] = None,
    tipo_letra: Optional[str] = None,
) -> Response:
    """
    Genera un PDF tabular reutilizable y elegante en orientación horizontal,
    obteniendo automáticamente la configuración guardada en BD si no se pasa explícita.
    """
    cfg = _obtener_o_crear_config_pdf(db)

    encabezado_final = encabezado if encabezado is not None else cfg.encabezado
    pie_final = pie_de_pagina if pie_de_pagina is not None else cfg.pie_dePagina
    logo_final = logo if logo is not None else cfg.logo
    letra_final = tipo_letra if tipo_letra is not None else cfg.tipo_letra

    fuente_regular, fuente_negrita = _resolver_fuente_reportlab(letra_final)

    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=30,
        rightMargin=30,
        topMargin=48 if (encabezado_final or logo_final) else 30,
        bottomMargin=40 if pie_final else 30,
    )

    elements = []
    styles = getSampleStyleSheet()

    titulo_style = ParagraphStyle(
        "TituloReporte",
        parent=styles["Heading1"],
        fontName=fuente_negrita,
        fontSize=16,
        leading=20,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=15,
    )
    elements.append(Paragraph(titulo_reporte, titulo_style))
    elements.append(Spacer(1, 10))

    headers_keys = list(columnas.keys())
    headers_labels = list(columnas.values())

    header_style = ParagraphStyle(
        "HeaderStyle",
        fontName=fuente_negrita,
        fontSize=9,
        leading=11,
        textColor=colors.white,
    )

    cell_style = ParagraphStyle(
        "CellStyle",
        fontName=fuente_regular,
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#1e293b"),
    )

    tabla_datos = [[Paragraph(label, header_style) for label in headers_labels]]

    for fila in datos:
        row = []
        for key in headers_keys:
            val = str(fila.get(key, "")) if fila.get(key) is not None else "—"
            row.append(Paragraph(val, cell_style))
        tabla_datos.append(row)

    t = Table(tabla_datos, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ]
        )
    )

    elements.append(t)

    def _decorar_pagina(canvas, doc_obj):
        canvas.saveState()
        ancho, alto = doc_obj.pagesize

        if logo_final:
            try:
                imagen_logo = _cargar_imagen_logo(logo_final)
                if imagen_logo is not None:
                    canvas.drawImage(
                        imagen_logo,
                        ancho - doc_obj.rightMargin - 70,
                        alto - doc_obj.topMargin + 6,
                        width=70,
                        height=24,
                        preserveAspectRatio=True,
                        mask="auto",
                    )
            except Exception:
                pass

        if encabezado_final:
            canvas.setFont(fuente_negrita, 8.5)
            canvas.setFillColor(colors.HexColor("#475569"))
            canvas.drawString(
                doc_obj.leftMargin,
                alto - doc_obj.topMargin + 14,
                encabezado_final,
            )

        if pie_final:
            canvas.setFont(fuente_regular, 8.5)
            canvas.setFillColor(colors.HexColor("#475569"))
            canvas.drawString(
                doc_obj.leftMargin,
                20,
                pie_final,
            )

        canvas.restoreState()

    doc.build(elements, onFirstPage=_decorar_pagina, onLaterPages=_decorar_pagina)

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

