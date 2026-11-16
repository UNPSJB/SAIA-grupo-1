from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.autenticacion.dependencies import requiere_admin
from src.database import get_db
from src.indentificadorDeQR import schemas, services
from src.producto import schemas as producto_schemas


router=APIRouter(prefix="/identificadorQR",tags=["identificadorQR"])




@router.post("/",response_model=schemas.IdentificadorQR, dependencies=[Depends(requiere_admin)])
async def createIdentificador(ident: schemas.IdentificadorQRCreate, db: Session = Depends(get_db)):
    return services.crear_IdentificadorUnico(db, ident)


# publico (sin login): lo consulta la vista que se abre con el QR
@router.get("/verificar/{identificador_id}")
def verificar_y_redirigir(identificador_id: str, db: Session = Depends(get_db)):
    identificador = services.verificar_identificadorQR(db, identificador_id)
    

    return identificador


@router.put("/{identificador_id}", response_model=schemas.IdentificadorQR, dependencies=[Depends(requiere_admin)])
async def editar_identificadorQR(identificador_id: str, db: Session = Depends(get_db)):
    return services.editar_identificadorQr(db, identificador_id)

@router.put("/{identificador_id}/ver-grafico", response_model=schemas.IdentificadorQR, dependencies=[Depends(requiere_admin)])
async def actualizar_estado_grafico(identificador_id: str, ident_update: schemas.IdentifacadorQRUpdate, db: Session = Depends(get_db)):
    return services.actualizar_ver_grafico(db, identificador_id, ident_update)

@router.put("/{identificador_id}/ver-acercaDeNosotros", response_model=schemas.IdentificadorQR, dependencies=[Depends(requiere_admin)])
async def actualizar_estado_acercaDeNosotros(identificador_id: str, ident_update: schemas.IdentifacadorQRUpdate, db: Session = Depends(get_db)):
    return services.actualizar_ver_acercaDeNosotros(db, identificador_id, ident_update)

@router.put("/{identificador_id}/ver-productos", response_model=schemas.IdentificadorQR, dependencies=[Depends(requiere_admin)])
async def actualizar_estado_productos(identificador_id: str, ident_update: schemas.IdentifacadorQRUpdate, db: Session = Depends(get_db)):
    return services.actualizar_ver_productos(db, identificador_id, ident_update)

# publico (sin login): lo consulta la vista que se abre con el QR
@router.get("/{identificador_id}/productos", response_model=List[producto_schemas.ProductoPublico])
def listar_productos_publicos(identificador_id: str, db: Session = Depends(get_db)):
    return services.listar_productos_publicos(db, identificador_id)


@router.get("/{identificador_id}/estadisticas")
def obtener_estadisticas_publicas(identificador_id: str, db: Session = Depends(get_db)):
    return services.obtener_estadisticas_publicas(db, identificador_id)
