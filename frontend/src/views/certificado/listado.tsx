import React, { useEffect, useState } from 'react';
import type { Certificado } from './tipos';
import { apiFetch } from '../../api/client';
import '../../styles/formularioAlta.css';

interface PersonalInfo {
  legajo: number;
  nombre: string;
  apellido: string;
}

interface ListadoCertificadosProps {
  onVerPersona?: (legajo: number, nombreCompleto: string) => void;
}

type EstadoVencimiento = 'vencido' | 'proximo' | 'al_dia';
type FiltroEstado = 'TODOS' | 'VENCIDOS' | 'PROXIMOS' | 'AL_DIA';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const ListadoCertificados: React.FC<ListadoCertificadosProps> = ({
  onVerPersona,
}) => {
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [personalMap, setPersonalMap] = useState<Record<number, PersonalInfo>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('TODOS');

  // Estado para el modal de evidencia flotante
  const [modalArchivoUrl, setModalArchivoUrl] = useState<string | null>(null);

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const [resCerts, resPers] = await Promise.all([
          apiFetch('/certificados/'),
          apiFetch('/personal/'),
        ]);

        const dataCerts: Certificado[] = resCerts.ok ? await resCerts.json() : [];
        const dataPers: PersonalInfo[] = resPers.ok ? await resPers.json() : [];

        // Diccionario de personal por legajo
        const dict: Record<number, PersonalInfo> = {};
        if (Array.isArray(dataPers)) {
          dataPers.forEach((p) => {
            dict[p.legajo] = p;
          });
        }
        setPersonalMap(dict);

        // Ordenar por urgencia cronológica
        if (Array.isArray(dataCerts)) {
          const ordenados = [...dataCerts].sort((a, b) => {
            const dateA = a.fechaVencimiento ? new Date(a.fechaVencimiento).getTime() : Infinity;
            const dateB = b.fechaVencimiento ? new Date(b.fechaVencimiento).getTime() : Infinity;
            return dateA - dateB;
          });
          setCertificados(ordenados);
        }
      } catch (error) {
        console.error('Error al cargar datos:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  const formatearFecha = (fechaStr?: string | null) => {
    if (!fechaStr) return 'Sin fecha';
    try {
      const d = new Date(fechaStr);
      return isNaN(d.getTime())
        ? fechaStr
        : d.toLocaleDateString('es-AR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          });
    } catch {
      return fechaStr;
    }
  };

  const calcularEstadoVencimiento = (fechaStr?: string | null): { estado: EstadoVencimiento; diffDias: number } => {
    if (!fechaStr) return { estado: 'al_dia', diffDias: 999 };
    const fechaLimite = new Date(fechaStr);
    const hoy = new Date();
    const diffTiempo = fechaLimite.getTime() - hoy.getTime();
    const diffDias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));

    if (diffDias <= 0) return { estado: 'vencido', diffDias };
    if (diffDias <= 15) return { estado: 'proximo', diffDias };
    return { estado: 'al_dia', diffDias };
  };

  const renderBotonArchivo = (fotoUrl?: string | null) => {
    if (!fotoUrl) {
      return <span style={{ color: '#9ca3af' }}>Sin archivo</span>;
    }

    const urlCompleta = fotoUrl.startsWith('http') ? fotoUrl : `${API_URL}${fotoUrl}`;
    const esPdf = fotoUrl.toLowerCase().endsWith('.pdf');

    return (
      <button
        type="button"
        onClick={() => setModalArchivoUrl(urlCompleta)}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          color: '#2563eb',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          whiteSpace: 'nowrap',
          fontSize: 'inherit',
        }}
        title="Ver evidencia"
      >
        <span>{esPdf ? 'Ver documento' : 'Ver imagen'}</span>
        <span>↗</span>
      </button>
    );
  };

  const certificadosFiltrados = certificados.filter((c) => {
    const { estado } = calcularEstadoVencimiento(c.fechaVencimiento);

    if (filtroEstado === 'VENCIDOS' && estado !== 'vencido') return false;
    if (filtroEstado === 'PROXIMOS' && estado !== 'proximo') return false;
    if (filtroEstado === 'AL_DIA' && estado !== 'al_dia') return false;

    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;

    const persona = personalMap[c.legajo_persona];
    const nombrePersona = persona ? `${persona.nombre} ${persona.apellido}`.toLowerCase() : '';
    const legajoStr = String(c.legajo_persona);
    const tipoStr = c.tipo.toLowerCase();

    return (
      tipoStr.includes(term) ||
      nombrePersona.includes(term) ||
      legajoStr.includes(term)
    );
  });

  const modalEsPdf = modalArchivoUrl?.toLowerCase().endsWith('.pdf');

  return (
    <div className="modulo-container">
      <div className="listado-top-bar">
        <div className="modulo-header">
          <h1 style={{ lineHeight: '1.2' }}>Vencimientos de Personal</h1>
          <div className="subtitulo">
            Listado consolidado ordenado por urgencia
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="filtros-top-bar">
        <input
          type="text"
          className="input-busqueda"
          placeholder="Buscar por empleado, legajo o tipo de certificado..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          className="select-filtro"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as FiltroEstado)}
        >
          <option value="TODOS">Todos los estados</option>
          <option value="VENCIDOS">Vencidos</option>
          <option value="PROXIMOS">Próximos a vencer (≤ 15 días)</option>
          <option value="AL_DIA">Al día</option>
        </select>
      </div>

      <div className="tabla-wrapper">
        <table className="tabla-custom">
          <thead>
            <tr>
              <th>Urgencia</th>
              <th>Vencimiento</th>
              <th>Personal</th>
              <th>Legajo</th>
              <th>Certificado</th>
              <th>Archivo</th>
              <th className="acciones-col">Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  Cargando vencimientos...
                </td>
              </tr>
            ) : certificadosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  No se encontraron vencimientos para mostrar.
                </td>
              </tr>
            ) : (
              certificadosFiltrados.map((item) => {
                const persona = personalMap[item.legajo_persona];
                const nombreCompleto = persona ? `${persona.apellido}, ${persona.nombre}` : '';
                const { estado, diffDias } = calcularEstadoVencimiento(item.fechaVencimiento);

                return (
                  <tr key={item.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {estado === 'vencido' && (
                        <span
                          style={{
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            border: '1px solid #f87171',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            display: 'inline-block',
                          }}
                        >
                          ● Vencido ({Math.abs(diffDias)} d)
                        </span>
                      )}

                      {estado === 'proximo' && (
                        <span
                          style={{
                            backgroundColor: '#fef3c7',
                            color: '#d97706',
                            border: '1px solid #fcd34d',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            display: 'inline-block',
                          }}
                        >
                          ▲ Vence en {diffDias} dias
                        </span>
                      )}

                      {estado === 'al_dia' && (
                        <span
                          style={{
                            backgroundColor: '#ecfdf5',
                            color: '#059669',
                            border: '1px solid #a7f3d0',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            display: 'inline-block',
                          }}
                        >
                          ✓ Al día
                        </span>
                      )}
                    </td>
                    <td>
                      <strong>{formatearFecha(item.fechaVencimiento)}</strong>
                    </td>
                    <td>
                      {nombreCompleto ? (
                        <strong>{nombreCompleto}</strong>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>Cargando...</span>
                      )}
                    </td>
                    <td>#{item.legajo_persona}</td>
                    <td>{item.tipo}</td>
                    <td>{renderBotonArchivo(item.foto_url)}</td>
                    <td className="acciones-col">
                      <button
                        type="button"
                        className="btn-guardar"
                        style={{
                          fontSize: '11px',
                          padding: '5px 10px',
                          whiteSpace: 'nowrap',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                        title="Gestionar en el perfil de la persona"
                        onClick={() => {
                          if (onVerPersona) {
                            onVerPersona(item.legajo_persona, nombreCompleto);
                          } else {
                            window.location.hash = `#/personal`;
                          }
                        }}
                      >
                        Gestionar ↗
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {modalArchivoUrl && (
        <div
          onClick={() => setModalArchivoUrl(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '750px',
              width: '100%',
              padding: '1.25rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: '#475569',
                }}
              >
                Archivo
              </h2>
              <button
                type="button"
                onClick={() => setModalArchivoUrl(null)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid #1e293b',
                  borderRadius: '6px',
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  cursor: 'pointer',
                }}
              >
                ✕ Cerrar
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                maxHeight: '75vh',
                overflow: 'hidden',
                borderRadius: '6px',
              }}
            >
              {modalEsPdf ? (
                <iframe
                  src={modalArchivoUrl}
                  title="Documento adjunto"
                  style={{
                    width: '100%',
                    height: '65vh',
                    border: 'none',
                    borderRadius: '6px',
                  }}
                />
              ) : (
                <img
                  src={modalArchivoUrl}
                  alt="Comprobante de certificado"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '75vh',
                    objectFit: 'contain',
                    borderRadius: '6px',
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListadoCertificados;