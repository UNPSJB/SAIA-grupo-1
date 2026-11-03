import json
import uuid
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from src.producto.models import Producto
from src.insumos.models import UnidadMedida, Insumo
from src.produccion.models import LoteProduccion, InsumoLote
from src.personal.models import Personal
from src.checklist.models import Checklist, ChecklistItem, EstadoTareaItem
from src.tareas.models import Tarea
from src.indentificadorDeQR.models import IndentificadorUnico
from src.AcercaDeNostros.models import AcercaDeNosotros

def asegurar_datos_dashboard(db: Session) -> None:
    hoy = date.today()

    if db.query(Producto).count() == 0:
        productos_def = [
            Producto(nombre="Pan de Campo", descripcion="Pan rústico de masa madre 500g", unidadMedida=UnidadMedida.KILOGRAMOS, activo=True, visible_publico=True),
            Producto(nombre="Medialunas de Manteca", descripcion="Docena de medialunas dulces hojaldradas", unidadMedida=UnidadMedida.UNIDADES, activo=True, visible_publico=True),
            Producto(nombre="Baguette Tradicional", descripcion="Baguette artesanal crujiente 250g", unidadMedida=UnidadMedida.UNIDADES, activo=True, visible_publico=True),
            Producto(nombre="Torta de Chocolate", descripcion="Torta artesanal húmeda con cobertura semiamarga", unidadMedida=UnidadMedida.KILOGRAMOS, activo=True, visible_publico=True),
            Producto(nombre="Pan Lactal Blanco", descripcion="Pan de molde enriquecido con leche 450g", unidadMedida=UnidadMedida.UNIDADES, activo=True, visible_publico=True),
            Producto(nombre="Pan de Salvado y Semillas", descripcion="Pan integral con mix de semillas 450g", unidadMedida=UnidadMedida.UNIDADES, activo=True, visible_publico=True),
            Producto(nombre="Facturas Surtidas", descripcion="Variedad de medialunas, vigilantes y cañoncitos", unidadMedida=UnidadMedida.UNIDADES, activo=True, visible_publico=True),
            Producto(nombre="Budin de Limon y Glaseado", descripcion="Budín esponjoso con glaseado de limón 350g", unidadMedida=UnidadMedida.UNIDADES, activo=True, visible_publico=False),
            Producto(nombre="Chipa Tradicional", descripcion="Chipa de queso y almidón de mandioca", unidadMedida=UnidadMedida.KILOGRAMOS, activo=True, visible_publico=True),
            Producto(nombre="Ciabatta Rústica", descripcion="Pan italiano de alta hidratación 300g", unidadMedida=UnidadMedida.UNIDADES, activo=True, visible_publico=False),
        ]
        db.add_all(productos_def)
        db.commit()

    if db.query(LoteProduccion).count() == 0:
        prods = {p.nombre: p for p in db.query(Producto).all()}
        insumos = {i.nombre: i for i in db.query(Insumo).all()}
        pers = db.query(Personal).filter(Personal.activo == True).all()
        pers_legs = [p.legajo for p in pers] if pers else [1]

        lotes_data = []

        for d in range(7):
            f_dia = hoy - timedelta(days=6 - d)
            leg = pers_legs[d % len(pers_legs)]
            if "Pan de Campo" in prods:
                lotes_data.append((prods["Pan de Campo"], f_dia, 60.0 + (d * 5 % 25), leg, [("Harina 000", 32.0), ("Levadura Fresca", 1.1), ("Sal Fina", 0.7)]))
            if "Medialunas de Manteca" in prods:
                lotes_data.append((prods["Medialunas de Manteca"], f_dia, 150.0 + (d * 15 % 60), leg, [("Harina 0000", 22.0), ("Manteca", 9.0)]))
            if d % 2 == 0 and "Baguette Tradicional" in prods:
                lotes_data.append((prods["Baguette Tradicional"], f_dia, 80.0 + (d * 4 % 20), leg, [("Harina 000", 18.0)]))
            elif "Facturas Surtidas" in prods:
                lotes_data.append((prods["Facturas Surtidas"], f_dia, 110.0 + (d * 8 % 30), leg, [("Harina 0000", 16.0), ("Manteca", 6.5)]))

        for idx_sem, dias_atras in enumerate([8, 12, 15, 19, 22, 26, 30]):
            f_sem = hoy - timedelta(days=dias_atras)
            leg = pers_legs[(idx_sem + 1) % len(pers_legs)]
            if "Pan de Campo" in prods:
                lotes_data.append((prods["Pan de Campo"], f_sem, 70.0 + (idx_sem * 4 % 20), leg, [("Harina 000", 35.0)]))
            if "Medialunas de Manteca" in prods:
                lotes_data.append((prods["Medialunas de Manteca"], f_sem, 160.0 + (idx_sem * 10 % 40), leg, [("Harina 0000", 24.0)]))
            if "Torta de Chocolate" in prods and idx_sem % 2 == 0:
                lotes_data.append((prods["Torta de Chocolate"], f_sem, 25.0 + idx_sem, leg, []))

        for m in range(1, hoy.month):
            for idx_d, dia_num in enumerate([5, 12, 19, 26]):
                f_mes = date(hoy.year, m, dia_num)
                leg = pers_legs[(m + idx_d) % len(pers_legs)]
                if "Pan de Campo" in prods:
                    lotes_data.append((prods["Pan de Campo"], f_mes, 80.0 + ((m + idx_d) * 3 % 20), leg, [("Harina 000", 40.0)]))
                if "Medialunas de Manteca" in prods:
                    lotes_data.append((prods["Medialunas de Manteca"], f_mes, 190.0 + ((m + idx_d) * 8 % 50), leg, [("Harina 0000", 28.0)]))

        for idx, (prod, f_lote, cant, resp, ins_lista) in enumerate(lotes_data, start=1):
            lote_obj = LoteProduccion(
                codigo=f"L-{f_lote:%Y%m%d}-{idx:02d}",
                producto_id=prod.id,
                fecha=f_lote,
                cantidad=cant,
                responsable_legajo=resp,
            )
            for nom_ins, cant_ins in ins_lista:
                ins_db = insumos.get(nom_ins)
                if ins_db:
                    lote_obj.insumos.append(InsumoLote(insumo=ins_db, cantidad=cant_ins))
            db.add(lote_obj)
        db.commit()

    checklists_ultimos_dias = db.query(Checklist).filter(Checklist.fecha >= hoy - timedelta(days=7)).count()
    if checklists_ultimos_dias == 0:
        pers = db.query(Personal).filter(Personal.activo == True).all()
        pers_legs = [p.legajo for p in pers] if pers else [1]
        tareas = db.query(Tarea).all()

        patron_insumos = [
            [
                {"nombre": "Lavandina Concentrada 55g", "cantidad": 0.45, "unidad": "L"},
                {"nombre": "Detergente Neutro Espumante", "cantidad": 0.20, "unidad": "L"},
            ],
            [
                {"nombre": "Amonio Cuaternario 5ta Generacion", "cantidad": 0.35, "unidad": "L"},
                {"nombre": "Sanitizante Clorado Liquido", "cantidad": 0.15, "unidad": "L"},
            ],
            [
                {"nombre": "Desengrasante Alcalino Pesado", "cantidad": 0.50, "unidad": "L"},
                {"nombre": "Detergente Neutro Espumante", "cantidad": 0.25, "unidad": "L"},
            ],
            [
                {"nombre": "Lavandina Concentrada 55g", "cantidad": 0.30, "unidad": "L"},
                {"nombre": "Desengrasante Alcalino Pesado", "cantidad": 0.40, "unidad": "L"},
            ],
        ]

        for offset in range(7, -1, -1):
            fecha = hoy - timedelta(days=offset)
            resp_legajo = pers_legs[offset % len(pers_legs)]
            chk = Checklist(fecha=fecha, responsable_legajo=resp_legajo, activo=True)

            for idx_t, t in enumerate(tareas[:6]):
                ins_idx = (offset + idx_t) % len(patron_insumos)
                chk_item = ChecklistItem(
                    plan_id=t.plan_id,
                    nombre_plan=t.nombre_plan if t.plan_de_limpieza else "Plan Limpieza",
                    tarea_id=t.id,
                    nombre_tarea=t.nombre,
                    descripcion_tarea=t.descripcion,
                    frecuencia=t.frecuencia,
                    estado=EstadoTareaItem.REALIZADO,
                    responsable_legajo=resp_legajo,
                    insumos_utilizados=json.dumps(patron_insumos[ins_idx], ensure_ascii=False),
                    fecha_hora_fin=datetime.combine(fecha, datetime.min.time()) + timedelta(hours=9, minutes=20 * idx_t),
                )
                chk.items.append(chk_item)
            db.add(chk)
        db.commit()

    if db.query(IndentificadorUnico).count() == 0:
        id_qr = str(uuid.uuid4())
        db.add(IndentificadorUnico(
            id_alfanumerico=id_qr,
            estado=True,
            urldelQR=f"http://localhost:5173/publico/{id_qr}",
            ver_grafico=True,
            verAcercaDeNosotros=True,
            verProductos=True,
        ))
        db.commit()

    if db.query(AcercaDeNosotros).count() == 0:
        db.add(AcercaDeNosotros(
            id=1,
            descripcion="Somos una panificadora y elaboradora de alimentos artesanales comprometida con los más altos estándares de inocuidad alimentaria, trazabilidad de materias primas y buenas prácticas de manufactura (BPM).",
        ))
        db.commit()

