from src.exceptions import NotAuthenticated, PermissionDenied

class CredencialesInvalidas(NotAuthenticated):
    DETAIL = "Usuario o contraseña incorrectos"

class UsuarioInactivo(PermissionDenied):
    DETAIL = "El usuario está inactivo"
