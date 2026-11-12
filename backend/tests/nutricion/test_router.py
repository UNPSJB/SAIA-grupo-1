from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from src.main import app
from src.insumos.models import Insumo, UnidadMedida
from src.producto.models import Producto
from src.recetas.models import Receta, VersionReceta, RecetaDetalle
from tests.database import session

client = TestClient(app)

def test_listar_y_modificar_parametros(session: Session):
    res = client.get("/nutricion/parametros")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 11

    res_put = client.put(
        "/nutricion/parametros/carbohidratos",
        json={"vdr": 310.0, "cifras_decimales": 0},
    )
    assert res_put.status_code == 200
    modificado = res_put.json()
    assert modificado["vdr"] == 310.0
    assert modificado["cifras_decimales"] == 0

    res_reset = client.post("/nutricion/parametros/restablecer")
    assert res_reset.status_code == 200
    carbs = next(p for p in res_reset.json() if p["nutriente"] == "carbohidratos")
    assert carbs["vdr"] == 300.0

def test_endpoints_nutricion_producto(session: Session):
    insumo = Insumo(
        nombre="Harina Router Test",
        lote="ROT-01",
        fechaRecepcion=datetime.now(),
        cantRecibida=10.0,
        stock=10.0,
        medida=UnidadMedida.KILOGRAMOS,
        energia_kcal=350.0,
        carbohidratos=72.0,
        proteinas=10.0,
        grasas_totales=1.2,
        sodio_mg=5.0,
    )
    session.add(insumo)
    session.flush()

    receta = Receta(
        nombre="Receta Router Test",
        rendimiento_final=900.0,
        activo=True,
    )
    session.add(receta)
    session.flush()

    version = VersionReceta(
        receta_id=receta.id,
        version=1,
        rendimiento_final=900.0,
        archivado=False,
        es_vigente=True,
    )
    session.add(version)
    session.flush()

    detalle = RecetaDetalle(
        nombre="Harina Detalle",
        version_receta_id=version.id,
        ingrediente_id=insumo.id,
        cantidad=1000.0,
        unidad_medida="GRAMOS",
        es_aditivo=False,
        operario_legajo=1,
        descripcion_pasos="Paso unico",
    )
    session.add(detalle)
    session.flush()

    prod = Producto(
        nombre="Pan Router Test",
        unidadMedida=UnidadMedida.KILOGRAMOS,
        activo=True,
        receta_id=receta.id,
        tamano_porcion_g=50.0,
    )
    session.add(prod)
    session.commit()

    res_calc = client.post(
        f"/nutricion/productos/{prod.id}/calcular",
        json={"tamano_porcion_g": 50.0, "porciones_por_envase": 18.0},
    )
    assert res_calc.status_code == 200
    info = res_calc.json()
    assert info["producto_id"] == prod.id
    assert len(info["tabla_nutricional"]) >= 11

    res_get = client.get(f"/nutricion/productos/{prod.id}")
    assert res_get.status_code == 200
    assert res_get.json()["id"] == info["id"]

    res_alias = client.get(f"/productos/{prod.id}/informacion-nutricional")
    assert res_alias.status_code == 200
    assert res_alias.json()["producto_id"] == prod.id

    res_verif = client.get(f"/nutricion/productos/{prod.id}/verificar-referencia")
    assert res_verif.status_code == 200
    assert "resultado_global_valido" in res_verif.json()
