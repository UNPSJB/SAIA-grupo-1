import logging
import sys
from src.config import settings

class SilenciarConnectionResetFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if record.name == "asyncio":
            msg = record.getMessage()
            if "_call_connection_lost" in msg or "10054" in msg or "ConnectionResetError" in msg:
                return False
            if record.exc_info and isinstance(record.exc_info[1], ConnectionResetError):
                return False
        return True

def setup_logging():
    """Configura el sistema de logging de la aplicación."""
    logging.basicConfig(
        level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    if sys.platform == "win32":
        logging.getLogger("asyncio").addFilter(SilenciarConnectionResetFilter())


def get_logger(name: str) -> logging.Logger:
    """Retorna una instancia de logger configurada para el módulo que lo solicite."""
    return logging.getLogger(name)
