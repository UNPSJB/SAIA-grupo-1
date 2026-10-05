import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../auth/useAuth';
import '../../styles/login.css';

// Atajos para probar con los usuarios del seed (scripts/seed_dev_db.py).
// Solo existen en desarrollo: en el build de producción este bloque se elimina.
const CONTRASENIA_DEMO = 'Clave1234';
const CUENTAS_DEMO = [
  { etiqueta: 'Administrador', usuario: 'ana.gomez' },
  { etiqueta: 'Operador', usuario: 'juan.perez' },
  { etiqueta: 'Operador y admin.', usuario: 'marcos.diaz' },
];

export const Login = () => {
  const { login, aviso } = useAuth();
  const [usuario, setUsuario] = useState('');
  const [contrasenia, setContrasenia] = useState('');
  const [verContrasenia, setVerContrasenia] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!usuario.trim() || !contrasenia) {
      setError('Ingresá tu usuario y tu contraseña.');
      return;
    }

    setError(null);
    setEnviando(true);
    try {
      await login(usuario.trim(), contrasenia);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
      setEnviando(false);
    }
  };

  return (
    <div className="login-pantalla">
      <div className="login-marca">
        <span className="login-logo" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3 4.5 6v5.5c0 4.4 3.1 8.3 7.5 9.5 4.4-1.2 7.5-5.1 7.5-9.5V6L12 3Z" />
            <path d="m8.8 12 2.4 2.4 4.2-4.4" />
          </svg>
        </span>
        <span className="login-marca-nombre">SAIA</span>
      </div>

      <form className="login-tarjeta" onSubmit={handleSubmit} noValidate>
        <h1>Ingresar</h1>
        <p className="login-subtitulo">Usá tu usuario y contraseña</p>

        {aviso && !error && <div className="login-aviso" role="status">{aviso}</div>}
        {error && <div className="login-error" role="alert">{error}</div>}

        <input
          className="login-input"
          type="text"
          name="usuario"
          placeholder="Usuario"
          aria-label="Usuario"
          autoComplete="username"
          autoCapitalize="none"
          autoFocus
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
        />

        <div className="login-input-contenedor">
          <input
            className="login-input"
            type={verContrasenia ? 'text' : 'password'}
            name="contrasenia"
            placeholder="Contraseña"
            aria-label="Contraseña"
            autoComplete="current-password"
            value={contrasenia}
            onChange={(e) => setContrasenia(e.target.value)}
          />
          <button
            type="button"
            className="login-mostrar"
            onClick={() => setVerContrasenia((v) => !v)}
          >
            {verContrasenia ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>

        <button type="submit" className="login-boton" disabled={enviando}>
          {enviando ? 'Ingresando...' : 'Entrar'}
        </button>
      </form>

      {import.meta.env.DEV && (
        <div className="login-demo">
          {CUENTAS_DEMO.map((cuenta) => (
            <button
              key={cuenta.usuario}
              type="button"
              className="login-chip"
              title={`Completa el usuario ${cuenta.usuario}`}
              onClick={() => {
                setUsuario(cuenta.usuario);
                setContrasenia(CONTRASENIA_DEMO);
                setError(null);
              }}
            >
              {cuenta.etiqueta}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
