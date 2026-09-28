from sqlalchemy import text
from src.database import SessionLocal

db = SessionLocal()
try:
    db.execute(text("UPDATE checklist_items SET estado = 'PENDIENTE', fecha_hora_fin = NULL"))
    db.execute(text("UPDATE checklists SET activo = 1"))
    db.commit()
    print(">>> Tareas reabiertas en PENDIENTE con exito.")
except Exception as e:
    db.rollback()
    print(f"Error al actualizar: {e}")
finally:
    db.close()
