import React from 'react';
import '../styles/navBarPublica.css'


export type ModuloPublico = 'estadisticas' | 'productos' | 'nosotros';

interface NavbarPublicaProps {
  moduloActivo: ModuloPublico;
  onCambiarModulo: (modulo: ModuloPublico) => void;
}

export const NavbarPublica: React.FC<NavbarPublicaProps> = ({
  moduloActivo,
  onCambiarModulo,
}) => {
  return (
    <header className="navbar-publica">
      {/* Logo y título */}
      <div className="navbar-logo-container">
        <div className="navbar-logo-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3 4.5 6v5.5c0 4.4 3.1 8.3 7.5 9.5 4.4-1.2 7.5-5.1 7.5-9.5V6L12 3Z" />
            <path d="m8.8 12 2.4 2.4 4.2-4.4" />
          </svg>
        </div>
        <div className="navbar-logo-text-group">
          <span className="navbar-logo-text">SAIA</span>
          <span className="navbar-logo-subtext">Panel público</span>
        </div>
      </div>

      {/* Menú de navegación central */}
      <nav className="navbar-menu">
        <button
          onClick={() => onCambiarModulo('estadisticas')}
          className={`navbar-btn ${moduloActivo === 'estadisticas' ? 'navbar-btn-activo' : ''}`}
        >
          Estadísticas
        </button>
        <button
          onClick={() => onCambiarModulo('productos')}
          className={`navbar-btn ${moduloActivo === 'productos' ? 'navbar-btn-activo' : ''}`}
        >
          Productos
        </button>
        <button
          onClick={() => onCambiarModulo('nosotros')}
          className={`navbar-btn ${moduloActivo === 'nosotros' ? 'navbar-btn-activo' : ''}`}
        >
          Nosotros
        </button>
      </nav>

      {/* Espaciador invisible para equilibrar el diseño a la derecha */}
      <div style={{ width: '100px' }} />
    </header>
  );
};