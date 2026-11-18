import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { NotificacionesPopover } from './alertas/NotificacionesPopover';

interface HeaderAppProps {
  onNavegarNotificacion: React.ComponentProps<typeof NotificacionesPopover>['onNavegar'];
  onIrAIncidentes: () => void;
  onIrAVencimientos: () => void;
  // abre el panel de Configuraciones (solo administradores)
  onIrAConfiguracion?: () => void;
}

// Barra superior de la app: notificaciones, modo claro/oscuro y menú del usuario
export const HeaderApp: React.FC<HeaderAppProps> = ({ onNavegarNotificacion, onIrAIncidentes, onIrAVencimientos, onIrAConfiguracion }) => {
  const { usuario, esAdministrador, logout } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [tema, setTema] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('saia_tema') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema);
    localStorage.setItem('saia_tema', tema);
  }, [tema]);

  // el menú del usuario se cierra al hacer clic afuera
  useEffect(() => {
    if (!menuAbierto) return;
    const cerrar = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAbierto(false);
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, [menuAbierto]);

  const obtenerIniciales = () => {
    if (!usuario) return 'SA';
    const n = usuario.nombre?.[0] ?? '';
    const a = usuario.apellido?.[0] ?? '';
    return (n + a).toUpperCase() || usuario.usuario.slice(0, 2).toUpperCase();
  };

  return (
    <header className="saia-app-header">
      <div className="saia-app-header-acciones">
        <NotificacionesPopover
          onNavegar={onNavegarNotificacion}
          onIrAIncidentes={onIrAIncidentes}
          onIrAVencimientos={onIrAVencimientos}
        />

        <button
          type="button"
          className="saia-campana-btn"
          onClick={() => setTema((prev) => (prev === 'light' ? 'dark' : 'light'))}
          title={tema === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
          aria-label={tema === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
        >
          {tema === 'light' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2m-7.07-14.93 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2m-14.93 7.07 1.41-1.41m11.32-11.32 1.41-1.41" />
            </svg>
          )}
        </button>

        {usuario && (
          <div className="saia-header-usuario" ref={menuRef}>
            <button
              type="button"
              className={`saia-header-usuario-btn ${menuAbierto ? 'abierto' : ''}`}
              onClick={() => setMenuAbierto((prev) => !prev)}
              title={`${usuario.nombre} ${usuario.apellido} (@${usuario.usuario})`}
              aria-haspopup="menu"
              aria-expanded={menuAbierto}
            >
              <span className="saia-user-avatar">{obtenerIniciales()}</span>
              <span className="saia-user-info">
                <span className="saia-user-name">
                  {usuario.nombre} {usuario.apellido}
                </span>
                <span className="saia-user-meta">{esAdministrador ? 'Administrador' : 'Operador'}</span>
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {menuAbierto && (
              <div className="saia-header-usuario-menu" role="menu">
                <div className="saia-header-usuario-datos">
                  <span className="saia-user-name">
                    {usuario.nombre} {usuario.apellido}
                  </span>
                  <span className="saia-user-meta">@{usuario.usuario}</span>
                </div>
                {esAdministrador && onIrAConfiguracion && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuAbierto(false);
                    onIrAConfiguracion();
                  }}
                  className="saia-logout-btn saia-menu-opcion"
                >
                  <span className="saia-sidebar-menu-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.77 1.02 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                    </svg>
                  </span>
                  <span className="saia-logout-label">Configuración</span>
                </button>
                )}
                <button type="button" role="menuitem" onClick={logout} className="saia-logout-btn">
                  <span className="saia-sidebar-menu-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" x2="9" y1="12" y2="12" />
                    </svg>
                  </span>
                  <span className="saia-logout-label">Cerrar sesión</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
