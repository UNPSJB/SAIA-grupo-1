import pytest
from datetime import datetime
from sqlalchemy.orm import Session
from src.insumos.models import Insumo
from src.tipoInsumo.models import Aditivo
from src.producto.models import Producto
from src.recetas.models import Receta, VersionReceta, RecetaDetalle
from src.nutricion import services
from src.nutricion.models import ParametroRedondeoNutricional
from src.nutricion.schemas import (
    ParametroRedondeoUpdate,
    InsumoNutricionalUpdate,
    CompletarIngredienteRequest,
    GuardarPorcionDeclaradaRequest,
)
from src.nutricion.exceptions import (
    ProductoSinRecetaError,
    RecetaSinIngredientesError,
    RendimientoInvalidoError,
    PorcionInvalidaError,
    ParametroInvalidoError,
)
from tests.database import session

def test_asegurar_parametros_defecto(session: Session):
    params = services.listar_parametros(session)
    assert len(params) >= 11
    nutrientes = [p.nutriente for p in params]
    assert "energia_kcal" in nutrientes
    assert "carbohidratos" in nutrientes
    assert "proteinas" in nutrientes
    assert "grasas_totales" in nutrientes
    assert "sodio_mg" in nutrientes

def test_actualizar_y_restablecer_parametro(session: Session):
    param = services.actualizar_parametro(
        session,
        "sodio_mg",
        ParametroRedondeoUpdate(vdr=2400.0, umbral_no_significativo=10.0),
    )
    assert param.vdr == 2400.0
    assert param.umbral_no_significativo == 10.0

    restablecidos = services.restablecer_parametros_defecto(session)
    sodio_rest = next(p for p in restablecidos if p.nutriente == "sodio_mg")
    assert sodio_rest.vdr == 2000.0
    assert sodio_rest.umbral_no_significativo == 5.0

def test_parametro_inexistente_lanza_error(session: Session):
    with pytest.raises(ParametroInvalidoError):
        services.actualizar_parametro(
            session,
            "nutriente_fantasma",
            ParametroRedondeoUpdate(vdr=100.0),
        )

def test_normalizar_a_gramos():
    assert services.normalizar_a_gramos(1.5, "KG") == 1500.0
    assert services.normalizar_a_gramos(2.0, "kilogramos") == 2000.0
    assert services.normalizar_a_gramos(500.0, "g") == 500.0
    assert services.normalizar_a_gramos(1.0, "L") == 1000.0
    assert services.normalizar_a_gramos(250.0, "ml") == 250.0

def test_redondear_y_formatear():
    param = ParametroRedondeoNutricional(
        nutriente="grasas_totales",
        nombre_mostrar="Grasas totales",
        unidad="g",
        vdr=55.0,
        umbral_no_significativo=0.5,
        cifras_decimales=1,
        cifras_decimales_mayores_10=0,
        texto_no_significativo="0",
        orden=7,
        activo=True,
    )
    val_cero, txt_cero, no_sig_cero = services.redondear_y_formatear(0.3, param)
    assert val_cero == 0.0
    assert txt_cero == "0"
    assert no_sig_cero is True

    val_dec, txt_dec, no_sig_dec = services.redondear_y_formatear(3.46, param)
    assert val_dec == 3.5
    assert txt_dec == "3,5"
    assert no_sig_dec is False

    val_ent, txt_ent, no_sig_ent = services.redondear_y_formatear(25.4, param)
    assert val_ent == 25.0
    assert txt_ent == "25"
    assert no_sig_ent is False

def test_actualizar_datos_insumo(session: Session):
    insumo = Insumo(
        nombre="Harina de Centeno",
        lote="CEN-01",
        fechaRecepcion=datetime.now(),
        cantRecibida=10.0,
        stock=10.0,
        medida="kilogramos",
    )
    session.add(insumo)
    session.commit()

    actualizado = services.actualizar_nutricion_insumo(
        session,
        insumo.id,
        InsumoNutricionalUpdate(
            energia_kcal=335.0,
            carbohidratos=65.0,
            proteinas=9.0,
            grasas_totales=1.5,
            sodio_mg=2.0,
        ),
    )
    assert actualizado.energia_kcal == 335.0
    assert actualizado.energia_kj == round(335.0 * 4.184, 1)
    assert actualizado.carbohidratos == 65.0

def test_calculo_nutricional_referencia_catedra_pan_de_campo(session: Session):
    ahora = datetime.now()
    h_harina = Insumo(
        nombre="Harina 000 Ref",
        lote="REF-01",
        fechaRecepcion=ahora,
        cantRecibida=100.0,
        stock=100.0,
        medida="kilogramos",
        energia_kcal=350.0,
        energia_kj=1464.4,
        carbohidratos=72.0,
        azucares_totales=1.5,
        azucares_anadidos=0.0,
        proteinas=10.0,
        grasas_totales=1.2,
        grasas_saturadas=0.3,
        grasas_trans=0.0,
        fibra_alimentaria=3.5,
        sodio_mg=5.0,
        fuente_datos="CAA",
    )
    h_agua = Insumo(
        nombre="Agua Potable Ref",
        lote="REF-02",
        fechaRecepcion=ahora,
        cantRecibida=100.0,
        stock=100.0,
        medida="litros",
        energia_kcal=0.0,
        energia_kj=0.0,
        carbohidratos=0.0,
        azucares_totales=0.0,
        azucares_anadidos=0.0,
        proteinas=0.0,
        grasas_totales=0.0,
        grasas_saturadas=0.0,
        grasas_trans=0.0,
        fibra_alimentaria=0.0,
        sodio_mg=0.0,
        fuente_datos="CAA",
    )
    h_levadura = Insumo(
        nombre="Levadura Fresca Ref",
        lote="REF-03",
        fechaRecepcion=ahora,
        cantRecibida=10.0,
        stock=10.0,
        medida="kilogramos",
        energia_kcal=105.0,
        energia_kj=439.3,
        carbohidratos=11.0,
        azucares_totales=0.0,
        azucares_anadidos=0.0,
        proteinas=8.5,
        grasas_totales=1.5,
        grasas_saturadas=0.3,
        grasas_trans=0.0,
        fibra_alimentaria=6.0,
        sodio_mg=30.0,
        fuente_datos="CAA",
    )
    h_sal = Insumo(
        nombre="Sal Fina Ref",
        lote="REF-04",
        fechaRecepcion=ahora,
        cantRecibida=10.0,
        stock=10.0,
        medida="kilogramos",
        energia_kcal=0.0,
        energia_kj=0.0,
        carbohidratos=0.0,
        azucares_totales=0.0,
        azucares_anadidos=0.0,
        proteinas=0.0,
        grasas_totales=0.0,
        grasas_saturadas=0.0,
        grasas_trans=0.0,
        fibra_alimentaria=0.0,
        sodio_mg=38850.0,
        fuente_datos="CAA",
    )
    h_aceite = Insumo(
        nombre="Aceite Girasol Ref",
        lote="REF-05",
        fechaRecepcion=ahora,
        cantRecibida=10.0,
        stock=10.0,
        medida="litros",
        energia_kcal=900.0,
        energia_kj=3765.6,
        carbohidratos=0.0,
        azucares_totales=0.0,
        azucares_anadidos=0.0,
        proteinas=0.0,
        grasas_totales=100.0,
        grasas_saturadas=11.0,
        grasas_trans=0.0,
        fibra_alimentaria=0.0,
        sodio_mg=0.0,
        fuente_datos="CAA",
    )
    session.add_all([h_harina, h_agua, h_levadura, h_sal, h_aceite])
    session.flush()

    prod = Producto(
        nombre="Pan de Campo Certificado",
        descripcion="500g",
        unidadMedida="kilogramos",
        activo=True,
        tamano_porcion_g=50.0,
        porciones_por_envase=28.0,
    )
    session.add(prod)
    session.flush()

    receta = Receta(
        nombre="Pan de Campo Catedra",
        id_producto=prod.id,
        operario_legajo=1,
        rendimiento_final=1400.0,
        activo=True,
    )
    session.add(receta)
    session.flush()

    version = VersionReceta(
        receta_id=receta.id,
        version=1,
        rendimiento_final=1400.0,
        archivado=False,
        es_vigente=True,
    )
    session.add(version)
    session.flush()

    detalles = [
        RecetaDetalle(
            nombre="Harina",
            version_receta_id=version.id,
            ingrediente_id=h_harina.id,
            cantidad=1000.0,
            unidad_medida="GRAMOS",
            es_aditivo=False,
            descripcion_pasos="Tamizar.",
        ),
        RecetaDetalle(
            nombre="Agua",
            version_receta_id=version.id,
            ingrediente_id=h_agua.id,
            cantidad=600.0,
            unidad_medida="GRAMOS",
            es_aditivo=False,
            descripcion_pasos="Añadir agua.",
        ),
        RecetaDetalle(
            nombre="Levadura",
            version_receta_id=version.id,
            ingrediente_id=h_levadura.id,
            cantidad=30.0,
            unidad_medida="GRAMOS",
            es_aditivo=False,
            descripcion_pasos="Disolver.",
        ),
        RecetaDetalle(
            nombre="Sal",
            version_receta_id=version.id,
            ingrediente_id=h_sal.id,
            cantidad=20.0,
            unidad_medida="GRAMOS",
            es_aditivo=False,
            descripcion_pasos="Amasar.",
        ),
        RecetaDetalle(
            nombre="Aceite",
            version_receta_id=version.id,
            ingrediente_id=h_aceite.id,
            cantidad=20.0,
            unidad_medida="GRAMOS",
            es_aditivo=False,
            descripcion_pasos="Incorporar aceite.",
        ),
    ]
    session.add_all(detalles)
    session.commit()

    resultado = services.calcular_informacion_nutricional(
        session,
        prod.id,
        usuario_actual="Auditor Nutricional",
    )

    assert resultado.producto_id == prod.id
    assert resultado.rendimiento_final_receta == 1400.0
    assert resultado.peso_total_ingredientes == 1670.0
    assert resultado.tamano_porcion_g == 50.0

    filas = {f.nutriente: f for f in resultado.tabla_nutricional}

    assert 260.0 <= filas["energia_kcal"].valor_100g <= 270.0
    assert 130.0 <= filas["energia_kcal"].valor_porcion <= 136.0
    assert filas["energia_kcal"].vd_porcentaje == 7.0

    assert 50.0 <= filas["carbohidratos"].valor_100g <= 54.0
    assert 25.0 <= filas["carbohidratos"].valor_porcion <= 27.0
    assert filas["carbohidratos"].vd_porcentaje == 9.0

    assert 7.0 <= filas["proteinas"].valor_100g <= 8.0
    assert 3.5 <= filas["proteinas"].valor_porcion <= 4.0
    assert filas["proteinas"].vd_porcentaje == 5.0

    assert 2.0 <= filas["grasas_totales"].valor_100g <= 2.8
    assert 1.0 <= filas["grasas_totales"].valor_porcion <= 1.5
    assert filas["grasas_totales"].vd_porcentaje == 2.0

    assert 540.0 <= filas["sodio_mg"].valor_100g <= 580.0
    assert 270.0 <= filas["sodio_mg"].valor_porcion <= 290.0
    assert filas["sodio_mg"].vd_porcentaje == 14.0

    verificacion = services.verificar_tolerancia_referencia_catedra(resultado, tolerancia_pct=5.0)
    assert verificacion.resultado_global_valido is True
    assert len(verificacion.detalles_100g) >= 5

def test_producto_sin_receta_falla(session: Session):
    prod = Producto(
        nombre="Producto Huerfano",
        unidadMedida="kilogramos",
        activo=True,
    )
    session.add(prod)
    session.commit()

    with pytest.raises(ProductoSinRecetaError):
        services.calcular_informacion_nutricional(session, prod.id)

def test_receta_sin_ingredientes_falla(session: Session):
    prod = Producto(
        nombre="Producto Con Receta Vacia",
        unidadMedida="kilogramos",
        activo=True,
    )
    session.add(prod)
    session.flush()

    receta = Receta(
        nombre="Receta Vacia",
        id_producto=prod.id,
        operario_legajo=1,
        rendimiento_final=100.0,
        activo=True,
    )
    session.add(receta)
    session.commit()

    with pytest.raises(RecetaSinIngredientesError):
        services.calcular_informacion_nutricional(session, prod.id)

def test_listar_ingredientes_incompletos_faltantes_y_fuente(session: Session):
    ahora = datetime.now()
    insumo_incompleto = Insumo(
        nombre="Harina Incompleta",
        lote="INC-01",
        fechaRecepcion=ahora,
        cantRecibida=10.0,
        stock=10.0,
        medida="kilogramos",
        energia_kcal=300.0,
        # faltan otros nutrientes y fuente_datos
    )
    session.add(insumo_incompleto)
    session.flush()

    prod = Producto(nombre="Pan Incompleto", unidadMedida="kilogramos", activo=True)
    session.add(prod)
    session.flush()

    receta = Receta(nombre="Receta Incompleta", id_producto=prod.id, operario_legajo=1, rendimiento_final=500.0, activo=True)
    session.add(receta)
    session.flush()

    version = VersionReceta(receta_id=receta.id, version=1, rendimiento_final=500.0, archivado=False, es_vigente=True)
    session.add(version)
    session.flush()

    det = RecetaDetalle(
        nombre="Harina",
        version_receta_id=version.id,
        ingrediente_id=insumo_incompleto.id,
        cantidad=500.0,
        unidad_medida="GRAMOS",
        es_aditivo=False,
        descripcion_pasos="Paso 1",
    )
    session.add(det)
    session.commit()

    incompletos = services.listar_ingredientes_incompletos(session, prod.id)
    assert len(incompletos) == 1
    assert incompletos[0]["nombre"] == "Harina Incompleta"
    assert "Fuente de información" in incompletos[0]["campos_faltantes"]
    assert "carbohidratos" in incompletos[0]["campos_faltantes_claves"]

def test_aditivo_sin_aporte_no_es_incompleto(session: Session):
    adit_sin_aporte = Aditivo(
        nombre="Colorante Caramelo Test",
        clase_funcional="COLORANTE",
        unidad_medida_id=1,
        aporta_energia_sodio=False,
        activo=True,
    )
    session.add(adit_sin_aporte)
    session.flush()

    prod = Producto(nombre="Producto Con Aditivo Inerte", unidadMedida="kilogramos", activo=True)
    session.add(prod)
    session.flush()

    receta = Receta(nombre="Receta Aditivo Inerte", id_producto=prod.id, operario_legajo=1, rendimiento_final=100.0, activo=True)
    session.add(receta)
    session.flush()

    version = VersionReceta(receta_id=receta.id, version=1, rendimiento_final=100.0, archivado=False, es_vigente=True)
    session.add(version)
    session.flush()

    det = RecetaDetalle(
        nombre="Colorante",
        version_receta_id=version.id,
        aditivo_id=adit_sin_aporte.id,
        cantidad=5.0,
        unidad_medida="GRAMOS",
        es_aditivo=True,
        descripcion_pasos="Agregar gota",
    )
    session.add(det)
    session.commit()

    incompletos = services.listar_ingredientes_incompletos(session, prod.id)
    # No considerar incompleto un aditivo sin datos nutricionales, salvo que aporte energía o sodio
    assert len(incompletos) == 0

def test_aditivo_con_aporte_es_incompleto_si_falta_energia_o_sodio(session: Session):
    adit_con_aporte = Aditivo(
        nombre="Bicarbonato de Sodio Test",
        clase_funcional="LEUDANTE",
        unidad_medida_id=1,
        aporta_energia_sodio=True,
        sodio_mg=None, # Falta sodio
        energia_kcal=None, # Falta energía
        activo=True,
    )
    session.add(adit_con_aporte)
    session.flush()

    prod = Producto(nombre="Producto Con Leudante", unidadMedida="kilogramos", activo=True)
    session.add(prod)
    session.flush()

    receta = Receta(nombre="Receta Leudante", id_producto=prod.id, operario_legajo=1, rendimiento_final=100.0, activo=True)
    session.add(receta)
    session.flush()

    version = VersionReceta(receta_id=receta.id, version=1, rendimiento_final=100.0, archivado=False, es_vigente=True)
    session.add(version)
    session.flush()

    det = RecetaDetalle(
        nombre="Bicarbonato",
        version_receta_id=version.id,
        aditivo_id=adit_con_aporte.id,
        cantidad=10.0,
        unidad_medida="GRAMOS",
        es_aditivo=True,
        descripcion_pasos="Mezclar",
    )
    session.add(det)
    session.commit()

    incompletos = services.listar_ingredientes_incompletos(session, prod.id)
    assert len(incompletos) == 1
    assert incompletos[0]["nombre"] == "Bicarbonato de Sodio Test"
    assert "Sodio" in incompletos[0]["campos_faltantes"]
    assert "Energía (kcal)" in incompletos[0]["campos_faltantes"]

def test_completar_ingrediente_y_recalculo_automatico(session: Session):
    ahora = datetime.now()
    insumo = Insumo(
        nombre="Avena Test Recalculo",
        lote="AVE-01",
        fechaRecepcion=ahora,
        cantRecibida=10.0,
        stock=10.0,
        medida="kilogramos",
    )
    session.add(insumo)
    session.flush()

    prod = Producto(nombre="Barra de Avena Test", unidadMedida="kilogramos", activo=True, tamano_porcion_g=40.0)
    session.add(prod)
    session.flush()

    receta = Receta(nombre="Receta Barra", id_producto=prod.id, operario_legajo=1, rendimiento_final=500.0, activo=True)
    session.add(receta)
    session.flush()

    version = VersionReceta(receta_id=receta.id, version=1, rendimiento_final=500.0, archivado=False, es_vigente=True)
    session.add(version)
    session.flush()

    det = RecetaDetalle(
        nombre="Avena",
        version_receta_id=version.id,
        ingrediente_id=insumo.id,
        cantidad=500.0,
        unidad_medida="GRAMOS",
        es_aditivo=False,
        descripcion_pasos="Mezclar",
    )
    session.add(det)
    session.commit()

    # Inicialmente incompleto
    incompletos = services.listar_ingredientes_incompletos(session, prod.id)
    assert len(incompletos) == 1

    # Completar ingrediente
    req = CompletarIngredienteRequest(
        producto_id=prod.id,
        tipo_entidad="insumo",
        entidad_id=insumo.id,
        valores={
            "fuente_datos": "CAA",
            "energia_kcal": 380.0,
            "energia_kj": 1590.0,
            "carbohidratos": 66.0,
            "azucares_totales": 1.0,
            "azucares_anadidos": 0.0,
            "proteinas": 13.0,
            "grasas_totales": 6.5,
            "grasas_saturadas": 1.2,
            "grasas_trans": 0.0,
            "fibra_alimentaria": 10.0,
            "sodio_mg": 4.0,
        },
    )

    resp = services.completar_ingrediente_y_recalcular(session, req, usuario_actual="TestAdmin")
    assert resp.recalculado is True
    assert resp.tabla_incompleta is False
    assert len(resp.ingredientes_incompletos) == 0
    assert resp.informacion_nutricional is not None
    assert resp.informacion_nutricional.es_incompleta is False
    assert len(resp.informacion_nutricional.tabla_nutricional) >= 11

def test_guardar_porcion_y_medida_casera_declaradas(session: Session):
    services.asegurar_parametros_defecto(session)
    ahora = datetime.now()
    insumo = Insumo(
        nombre="Harina Integral Test",
        lote="L-INT-01",
        fechaRecepcion=ahora,
        cantRecibida=10.0,
        stock=10.0,
        medida="kilogramos",
        energia_kcal=340.0,
        energia_kj=1422.0,
        carbohidratos=62.0,
        azucares_totales=1.5,
        azucares_anadidos=0.0,
        proteinas=12.0,
        grasas_totales=2.2,
        grasas_saturadas=0.4,
        grasas_trans=0.0,
        fibra_alimentaria=10.5,
        sodio_mg=5.0,
        fuente_datos="CAA",
    )
    session.add(insumo)
    session.flush()

    prod = Producto(
        nombre="Pan Integral de Prueba",
        descripcion="500g",
        unidadMedida="kilogramos",
        activo=True,
    )
    session.add(prod)
    session.flush()

    receta = Receta(
        nombre="Receta Pan Integral",
        id_producto=prod.id,
        operario_legajo=1,
        rendimiento_final=1000.0,
        activo=True,
    )
    session.add(receta)
    session.flush()

    version = VersionReceta(receta_id=receta.id, version=1, rendimiento_final=1000.0, archivado=False, es_vigente=True)
    session.add(version)
    session.flush()

    det = RecetaDetalle(
        nombre="Harina Integral",
        version_receta_id=version.id,
        ingrediente_id=insumo.id,
        cantidad=1000.0,
        unidad_medida="GRAMOS",
        es_aditivo=False,
        descripcion_pasos="Mezclar y amasar",
    )
    session.add(det)
    session.commit()

    req_porcion = GuardarPorcionDeclaradaRequest(
        tamano_porcion_g=60.0,
        medida_casera="2 rebanadas",
        porciones_por_envase=16.0,
        descripcion_porcion="2 rebanadas gruesas",
    )

    info = services.guardar_porcion_declarada(session, prod.id, req_porcion, usuario_actual="TesterAdmin")
    assert info.tamano_porcion_g == 60.0
    assert info.medida_casera == "2 rebanadas"
    assert info.porciones_por_envase == 16.0
    assert info.es_incompleta is False

    # Verificar que todos los nutrientes obligatorios están presentes en la tabla
    nutrientes_nombres = [f.nutriente for f in info.tabla_nutricional]
    assert "azucares_totales" in nutrientes_nombres
    assert "azucares_anadidos" in nutrientes_nombres
    assert "energia_kcal" in nutrientes_nombres
    assert "grasas_trans" in nutrientes_nombres
    assert "sodio_mg" in nutrientes_nombres

    # Verificar persistencia en el producto
    session.refresh(prod)
    assert prod.tamano_porcion_g == 60.0
    assert prod.medida_casera == "2 rebanadas"
    assert prod.porciones_por_envase == 16.0

def test_guardar_porcion_declarada_validaciones(session: Session):
    prod = Producto(
        nombre="Producto Para Validar Porcion",
        descripcion="Test",
        unidadMedida="kilogramos",
        activo=True,
    )
    session.add(prod)
    session.commit()

    # Tamaño de porción menor o igual a 0 debe fallar (validación de schema)
    with pytest.raises(Exception):
        GuardarPorcionDeclaradaRequest(
            tamano_porcion_g=-5.0,
            medida_casera="1 cucharada",
        )

    # Medida casera en blanco debe fallar (validación de schema)
    with pytest.raises(Exception):
        GuardarPorcionDeclaradaRequest(
            tamano_porcion_g=50.0,
            medida_casera="",
        )

