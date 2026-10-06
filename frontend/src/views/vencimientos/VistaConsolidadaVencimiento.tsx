import React, { useState, useEffect, useMemo } from 'react';

type TipoVencimiento = 'PERSONAL' | 'EQUIPO' | 'DOCUMENTO';
type EstadoUrgencia = 'VENCIDO' | 'PROXIMO' | 'VIGENTE';

interface IVencimientoConsolidado {
  id: string;
  tipo: TipoVencimiento;
  entidadNombre: string;
  descripcion: string;
  fechaVencimiento: string;
  diasRestantes: number;
  estado: EstadoUrgencia;
  idOriginal: number | string;
}

function calcularUrgencia(fechaStr: string): { diasRestantes: number; estado: EstadoUrgencia } {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const fechaVenc = new Date(fechaStr);
  fechaVenc.setHours(0, 0, 0, 0);

  const diferenciaMs = fechaVenc.getTime() - hoy.getTime();
  const diasRestantes = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));

  let estado: EstadoUrgencia = 'VIGENTE';
  if (diasRestantes < 0) {
    estado = 'VENCIDO';
  } else if (diasRestantes <= 30) {
    estado = 'PROXIMO';
  }

  return { diasRestantes, estado };
}

interface Props {
  onNavegar?: (vista: string, id?: string | number) => void;
}

export const VistaConsolidadaVencimiento: React.FC<Props> = ({ onNavegar }) => {
  const [vencimientos, setVencimientos] = useState<IVencimientoConsolidado[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState<string>('');

  useEffect(() => {
    cargarTodosLosVencimientos();
  }, []);

  const cargarTodosLosVencimientos = async () => {
    setCargando(true);
    const lista: IVencimientoConsolidado[] = [];

    try {
      const res = await fetch('/api/personal');
      if (res.ok) {
        const data = await res.json();
        data.forEach((p: any) => {
          const fecha = p.fechaVencimiento || p.vencimiento;
          if (fecha) {
            const { diasRestantes, estado } = calcularUrgencia(fecha);
            lista.push({
              id: `personal-${p.id}`,
              tipo: 'PERSONAL',
              entidadNombre: `${p.nombre || ''} ${p.apellido || ''}`.trim() || 'Personal',
              descripcion: p.tipoCertificado || p.motivo || 'Habilitación / Examen médico',
              fechaVencimiento: fecha,
              diasRestantes,
              estado,
              idOriginal: p.id,
            });
          }
        });
      }
    } catch (_) {}

    try {
      const res = await fetch('/api/equipos');
      if (res.ok) {
        const data = await res.json();
        data.forEach((e: any) => {
          const fecha = e.fechaProximaCalibracion || e.fechaVencimiento;
          if (fecha) {
            const { diasRestantes, estado } = calcularUrgencia(fecha);
            lista.push({
              id: `equipo-${e.id}`,
              tipo: 'EQUIPO',
              entidadNombre: e.nombre || e.codigo || 'Instrumento / Equipo',
              descripcion: e.tipoMantenimiento || 'Calibración / Mantenimiento',
              fechaVencimiento: fecha,
              diasRestantes,
              estado,
              idOriginal: e.id,
            });
          }
        });
      }
    } catch (_) {}

    try {
      const res = await fetch('/api/documentos');
      if (res.ok) {
        const data = await res.json();
        data.forEach((d: any) => {
          const fecha = d.fechaVencimiento || d.vencimiento;
          if (fecha) {
            const { diasRestantes, estado } = calcularUrgencia(fecha);
            lista.push({
              id: `doc-${d.id}`,
              tipo: 'DOCUMENTO',
              entidadNombre: d.titulo || d.nombre || 'Documento',
              descripcion: d.codigo || d.version || 'Revisión periódica documental',
              fechaVencimiento: fecha,
              diasRestantes,
              estado,
              idOriginal: d.id,
            });
          }
        });
      }
    } catch (_) {}

    const peso: Record<EstadoUrgencia, number> = { VENCIDO: 0, PROXIMO: 1, VIGENTE: 2 };
    lista.sort((a, b) => {
      if (peso[a.estado] !== peso[b.estado]) {
        return peso[a.estado] - peso[b.estado];
      }
      return a.diasRestantes - b.diasRestantes;
    });

    setVencimientos(lista);
    setCargando(false);
  };

  const elementosFiltrados = useMemo(() => {
    return vencimientos.filter((item) => {
      const matchTipo = filtroTipo === 'TODOS' || item.tipo === filtroTipo;
      const matchEstado = filtroEstado === 'TODOS' || item.estado === filtroEstado;
      const matchTexto =
        item.entidadNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        item.descripcion.toLowerCase().includes(busqueda.toLowerCase());

      return matchTipo && matchEstado && matchTexto;
    });
  }, [vencimientos, filtroTipo, filtroEstado, busqueda]);

  const renderBadge = (estado: EstadoUrgencia, dias: number) => {
    if (estado === 'VENCIDO') {
      return (
        <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '4px 10px', borderRadius: '12px', fontWeight: 600, fontSize: '13px' }}>
          Vencido ({Math.abs(dias)}d)
        </span>
      );
    }
    if (estado === 'PROXIMO') {
      return (
        <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '12px', fontWeight: 600, fontSize: '13px' }}>
          Próximo ({dias}d)
        </span>
      );
    }
    return (
      <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '12px', fontWeight: 600, fontSize: '13px' }}>
        Vigente ({dias}d)
      </span>
    );
  };

  const irAlRegistro = (item: IVencimientoConsolidado) => {
    if (onNavegar) {
      if (item.tipo === 'PERSONAL') onNavegar('personal', item.idOriginal);
      if (item.tipo === 'EQUIPO') onNavegar('equipos', item.idOriginal);
      if (item.tipo === 'DOCUMENTO') onNavegar('documentos', item.idOriginal);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '40px auto', padding: '0 24px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#111827' }}>
      {/* Encabezado estilo Personas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>
            Lista de Vencimientos
          </h1>
          <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500 }}>
            01 · Listado Consolidado
          </span>
        </div>
      </div>

      {}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar por nombre, elemento o detalle..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{
            flex: 1,
            minWidth: '280px',
            padding: '10px 14px',
            backgroundColor: '#f4f4f2',
            border: '1px solid transparent',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
          }}
        />

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          style={{
            padding: '10px 14px',
            backgroundColor: '#f4f4f2',
            border: '1px solid transparent',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#374151',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="TODOS">Todos los tipos</option>
          <option value="PERSONAL">Personal</option>
          <option value="EQUIPO">Calibración / Equipos</option>
          <option value="DOCUMENTO">Documentos</option>
        </select>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          style={{
            padding: '10px 14px',
            backgroundColor: '#f4f4f2',
            border: '1px solid transparent',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#374151',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="TODOS">Todos los estados</option>
          <option value="VENCIDO">Vencidos</option>
          <option value="PROXIMO">Próximos a vencer</option>
          <option value="VIGENTE">Vigentes</option>
        </select>
      </div>

      {}
      <div style={{ borderRadius: '8px', overflow: 'hidden', borderBottom: '1px solid #f3f4f6' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f7f6f0', color: '#111827' }}>
              <th style={{ padding: '14px 16px', fontWeight: 700 }}>Origen</th>
              <th style={{ padding: '14px 16px', fontWeight: 700 }}>Nombre / Elemento</th>
              <th style={{ padding: '14px 16px', fontWeight: 700 }}>Detalle</th>
              <th style={{ padding: '14px 16px', fontWeight: 700 }}>Fecha Vencimiento</th>
              <th style={{ padding: '14px 16px', fontWeight: 700 }}>Estado</th>
              <th style={{ padding: '14px 16px', fontWeight: 700 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#6b7280' }}>
                  Cargando vencimientos...
                </td>
              </tr>
            ) : elementosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#6b7280' }}>
                  No hay vencimientos registrados.
                </td>
              </tr>
            ) : (
              elementosFiltrados.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px 16px', color: '#4b5563' }}>
                    {item.tipo === 'PERSONAL' && 'Personal'}
                    {item.tipo === 'EQUIPO' && 'Calibración'}
                    {item.tipo === 'DOCUMENTO' && 'Documento'}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 600 }}>{item.entidadNombre}</td>
                  <td style={{ padding: '14px 16px', color: '#6b7280' }}>{item.descripcion}</td>
                  <td style={{ padding: '14px 16px', color: '#374151' }}>{item.fechaVencimiento}</td>
                  <td style={{ padding: '14px 16px' }}>{renderBadge(item.estado, item.diasRestantes)}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <button
                      type="button"
                      onClick={() => irAlRegistro(item)}
                      style={{
                        padding: '6px 12px',
                        cursor: 'pointer',
                        backgroundColor: '#111827',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VistaConsolidadaVencimiento;