from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Variables de entorno y rutas
    ENV: str = "DEV"
    ROOT_PATH_DEV: str = ""
    ROOT_PATH_PROD: str = ""

    # Base de datos
    DB_URL: str = "sqlite:///./app.db"
    DB_URL_TEST: str = "sqlite:///./test.db"

    # Logger y alertas
    LOG_LEVEL: str = "INFO"
    DIAS_ALERTA_VENCIMIENTO: int = 15

    # Autenticación y JWT
    JWT_SECRET: str = "clave_secreta_super_segura_para_desarrollo_12345"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60  # <-- Nombre exacto que requiere services.py

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


# Instancia global
settings = Settings()