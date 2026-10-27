import React, { useEffect, useState } from 'react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import '../../styles/dashboard.css';
import { useColoresTema } from './useColoresTemas';
import { useVistaPublica } from './contextDeVistaPublica';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../../api/client';
//import type { IdentificadorUnico } from './tipos';

type Periodo = 'dia' | 'semana' | 'mes';

export const Panel_Publico: React.FC = () => {
  // Los gráficos toman los colores de la paleta y cambian con el tema
  const colores = useColoresTema();
  
  // Consumimos el estado global del switch para ver si se muestra o no el gráfico
  const { verGrafico,setVerGrafico } = useVistaPublica();

  // Estado para el período del gráfico de tareas
  const [periodoCumplimiento, setPeriodoCumplimiento] = useState<Periodo>('semana');
  const { identificadorId } = useParams<{ identificadorId: string }>();

  // Estados para controlar la verificación del backend
  const [verificando, setVerificando] = useState(true);
  const [qrValido, setQrValido] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  //const [identQR,setIdentQR] = useState<IdentificadorUnico | null>(null);

  useEffect(() => {
    const verificarIdentificadorQR = async () => {
      try {
        setVerificando(true);
        // Llamada a tu backend en FastAPI
        const res = await apiFetch(`/identificadorQR/verificar/${identificadorId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          let mensaje = "Este código QR no es válido o ha expirado.";

          if (typeof errorData.detail === "string") {
            mensaje = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            mensaje = errorData.detail
              .map((err: { msg?: string }) => err.msg || JSON.stringify(err))
              .join(", ");
          }
          throw new Error(mensaje);
        }

        // 2. LEEMOS LA RESPUESTA DEL BACKEND
        const data = await res.json();
        
        // 3. ACTUALIZAMOS EL CONTEXTO CON EL ESTADO REAL GUARDADO EN LA BD
        if (typeof data.ver_grafico === 'boolean') {
          setVerGrafico(data.ver_grafico);
        }

        setQrValido(true);
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Error de conexión con el servidor.");
        setQrValido(false);
      } finally {
        setVerificando(false);
      }
    };

    if (identificadorId) {
      verificarIdentificadorQR();
    } else {
      setVerificando(false);
      setQrValido(false);
      setErrorMsg('No se encontró ningún identificador en el enlace.');
    }
  }, [identificadorId]);

  // Datos estáticos para el cumplimiento de tareas (sin carga pendiente)
  const loadingCumplimiento = false;
  const cumplimiento = {
    hechas: 4,
    pendientes: 2,
    vencidas: 1,
    porcentaje: 57
  };

  const totalTareas = cumplimiento.hechas + cumplimiento.pendientes + cumplimiento.vencidas;

  const datosDona = [
    { name: 'Hechas', value: cumplimiento.hechas, color: colores.exito },
    { name: 'Pendientes', value: cumplimiento.pendientes, color: colores.alerta },
    { name: 'Vencidas', value: cumplimiento.vencidas, color: colores.error },
  ];
  const datosFiltradosDona = datosDona.filter((d) => d.value > 0);

  if (verificando) {
    return (
      <div className="modulo-container dashboard-container" style={{ textAlign: 'center', marginTop: '60px' }}>
        <h2>Verificando acceso público...</h2>
      </div>
    );
  }

  // Pantalla de error si el QR no es válido
  if (!qrValido) {
    return (
      <div className="modulo-container dashboard-container" style={{ textAlign: 'center', marginTop: '60px' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Acceso no disponible</h2>
        <p>{errorMsg}</p>
      </div>
    );
  }

  return (
    <div className="modulo-container dashboard-container">

      <div className="modulo-header">
        <h1>Inicio</h1>
        <div className="subtitulo">Panel de estadísticas</div>
      </div>
      <div className="dashboard-grid">
        {/* Tarjeta condicional: Se muestra u oculta según el interruptor global */}
        {verGrafico && (
          <div className="dashboard-card" style={{ width: '100%', maxWidth: '600px' }}>
            <div className="dashboard-card-header">
              <h2>Cumplimiento de Tareas</h2>
              <select
                className="dashboard-select"
                value={periodoCumplimiento}
                onChange={(e) => setPeriodoCumplimiento(e.target.value as Periodo)}
                title="Seleccionar período de cumplimiento"
              >
                <option value="dia">Diario</option>
                <option value="semana">Semanal</option>
                <option value="mes">Mensual</option>
              </select>
            </div>

            {loadingCumplimiento ? (
              <p className="dashboard-sin-datos">Cargando cumplimiento...</p>
            ) : (
              <div className="dashboard-dona-fila">
                <div className="dashboard-dona-wrapper">
                  <ResponsiveContainer width={220} height={220}>
                    <PieChart>
                      {totalTareas === 0 ? (
                        <Pie
                          data={[{ name: 'Sin tareas', value: 1 }]}
                          dataKey="value"
                          innerRadius={65}
                          outerRadius={95}
                          stroke="none"
                        >
                          <Cell fill={colores.borde} />
                        </Pie>
                      ) : (
                        <Pie
                          data={datosFiltradosDona}
                          dataKey="value"
                          innerRadius={65}
                          outerRadius={95}
                          paddingAngle={datosFiltradosDona.length > 1 ? 2 : 0}
                          stroke="none"
                        >
                          {datosFiltradosDona.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      )}
                      <Tooltip contentStyle={{ backgroundColor: 'var(--color-superficie-elevada)', borderColor: 'var(--color-borde)', color: 'var(--color-texto)' }} itemStyle={{ color: 'var(--color-texto)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="dashboard-dona-centro">
                    {cumplimiento ? `${cumplimiento.porcentaje}%` : '0%'}
                  </div>
                </div>

                <div className="dashboard-dona-leyenda">
                  <span className="dashboard-dona-leyenda-item">
                    <i style={{ backgroundColor: colores.exito }} /> Hechas
                    <strong>{cumplimiento?.hechas || 0}</strong>
                  </span>
                  <span className="dashboard-dona-leyenda-item">
                    <i style={{ backgroundColor: colores.alerta }} /> Pendientes
                    <strong>{cumplimiento?.pendientes || 0}</strong>
                  </span>
                  <span className="dashboard-dona-leyenda-item">
                    <i style={{ backgroundColor: colores.error }} /> Vencidas
                    <strong>{cumplimiento?.vencidas || 0}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};