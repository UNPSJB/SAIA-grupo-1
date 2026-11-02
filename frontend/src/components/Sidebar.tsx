import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { puedeVerModulo } from '../auth/permisos';
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
  SidebarRail,
  SidebarTrigger,
} from './ui/sidebar';
import { useAlertasSistema } from '../hooks/useAlertasSistema';

export type Modulo =
  | 'dashboard'
  | 'insumos'
  | 'equipos'
  | 'sectores'
  | 'personas'
  | 'vencimientos'
  | 'tipoCertificado'
  | 'tipoDocumento'
  | 'insumos_quimicos'
  | 'elementosDeLimpieza'
  | 'planDeLimpieza'
  | 'checklist'
  | 'motivos'
  | 'documentos'
  | 'incidentes'
  | 'auditoria'
  | 'planDeCalibracion'
  | 'productos'
  | 'produccion';

interface SidebarProps {
  moduloActivo: Modulo;
  onCambiarModulo: (modulo: Modulo) => void;
}

interface ItemNavegacion {
  id: Modulo;
  label: string;
  icono: React.ReactNode;
}

interface GrupoNavegacion {
  id: string;
  titulo: string;
  items: ItemNavegacion[];
}

const ICONOS_MODULO: Record<Modulo, React.ReactNode> = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1.5" />
      <rect width="7" height="5" x="14" y="3" rx="1.5" />
      <rect width="7" height="9" x="14" y="12" rx="1.5" />
      <rect width="7" height="5" x="3" y="16" rx="1.5" />
    </svg>
  ),
  vencimientos: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="M12 14v3l2 1" />
    </svg>
  ),
  motivos: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  checklist: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="18" x="4" y="4" rx="2" />
      <path d="M9 2h6v3H9z" />
      <path d="m9 12 2 2 4-4" />
      <path d="M9 17h6" />
    </svg>
  ),
  planDeLimpieza: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect width="6" height="4" x="9" y="3" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  ),
  insumos_quimicos: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2v7.5L4.7 18.6A2 2 0 0 0 6.4 21.5h11.2a2 2 0 0 0 1.7-2.9L14 9.5V2" />
      <path d="M8.5 2h7" />
      <path d="M7 15h10" />
    </svg>
  ),
  elementosDeLimpieza: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
      <path d="M5 3v4M3 5h4" />
    </svg>
  ),
  equipos: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.77 1.02 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  ),
  planDeCalibracion: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 14 4-4" />
      <path d="M3.34 19a10 10 0 1 1 17.32 0" />
    </svg>
  ),
  sectores: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4v18" />
      <path d="M19 21V11l-6-4" />
      <path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01" />
    </svg>
  ),
  insumos: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 9.4 7.55 4.24" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" x2="12" y1="22" y2="12" />
    </svg>
  ),
  productos: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  ),
  personas: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  tipoCertificado: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  ),
  tipoDocumento: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
      <path d="M6 6h10" />
      <path d="M6 10h10" />
      <path d="M6 14h6" />
    </svg>
  ),
  documentos: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
    </svg>
  ),
  incidentes: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" x2="12" y1="9" y2="13" />
      <line x1="12" x2="12.01" y1="17" y2="17" />
    </svg>
  ),
  auditoria: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  produccion: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M17 18h1M12 18h1M7 18h1" />
    </svg>
  ),
};

export const Sidebar: React.FC<SidebarProps> = ({ moduloActivo, onCambiarModulo }) => {
  const { usuario, esAdministrador, logout } = useAuth();
  const { totalIncidentes, incidentesCriticos, vencimientosVencidos, vencimientosProximos } = useAlertasSistema();

  const [tema, setTema] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('saia_tema') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema);
    localStorage.setItem('saia_tema', tema);
  }, [tema]);

  const alternarTema = () => {
    setTema((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const gruposBase: GrupoNavegacion[] = [
    {
      id: 'general',
      titulo: 'Panel y Control',
      items: [
        { id: 'dashboard', label: 'Inicio', icono: ICONOS_MODULO.dashboard },
        { id: 'vencimientos', label: 'Vencimientos', icono: ICONOS_MODULO.vencimientos },
      ],
    },
    {
      id: 'poes',
      titulo: 'Higiene y POES',
      items: [
        { id: 'checklist', label: 'Checklists Diarios', icono: ICONOS_MODULO.checklist },
        { id: 'motivos', label: 'Motivos No Realización', icono: ICONOS_MODULO.motivos },
        { id: 'planDeLimpieza', label: 'Plan de Limpieza', icono: ICONOS_MODULO.planDeLimpieza },
        { id: 'insumos_quimicos', label: 'Químicos Limpieza', icono: ICONOS_MODULO.insumos_quimicos },
        { id: 'elementosDeLimpieza', label: 'Elementos de Limpieza', icono: ICONOS_MODULO.elementosDeLimpieza },
      ],
    },
    {
      id: 'planta',
      titulo: 'Planta y Equipos',
      items: [
        { id: 'equipos', label: 'Equipos', icono: ICONOS_MODULO.equipos },
        { id: 'planDeCalibracion', label: 'Plan de Calibración', icono: ICONOS_MODULO.planDeCalibracion },
        { id: 'sectores', label: 'Sectores', icono: ICONOS_MODULO.sectores },
        { id: 'insumos', label: 'Ingredientes', icono: ICONOS_MODULO.insumos },
        { id: 'productos', label: 'Productos Elaborados', icono: ICONOS_MODULO.productos },
      ],
    },
    {
      id: 'personal',
      titulo: 'Personal y Habilitaciones',
      items: [
        { id: 'personas', label: 'Personas', icono: ICONOS_MODULO.personas },
        { id: 'tipoCertificado', label: 'Tipo Certificado', icono: ICONOS_MODULO.tipoCertificado },
      ],
    },
    {
      id: 'calidad',
      titulo: 'Calidad y Trazabilidad',
      items: [
        { id: 'produccion', label: 'Producción', icono: ICONOS_MODULO.produccion },
        { id: 'documentos', label: 'Documentos', icono: ICONOS_MODULO.documentos },
        { id: 'tipoDocumento', label: 'Tipo Documento', icono: ICONOS_MODULO.tipoDocumento },
        {
          id: 'incidentes',
          label: esAdministrador ? 'Incidentes' : 'Reportar Incidente',
          icono: ICONOS_MODULO.incidentes,
        },
        { id: 'auditoria', label: 'Auditoría', icono: ICONOS_MODULO.auditoria },
      ],
    },
  ];

  const gruposVisibles = gruposBase
    .map((grupo) => ({
      ...grupo,
      items: grupo.items.filter((item) => puedeVerModulo(item.id, esAdministrador)),
    }))
    .filter((grupo) => grupo.items.length > 0);

  const obtenerIniciales = () => {
    if (!usuario) return 'SA';
    const n = usuario.nombre?.[0] ?? '';
    const a = usuario.apellido?.[0] ?? '';
    return (n + a).toUpperCase() || usuario.usuario.slice(0, 2).toUpperCase();
  };

  return (
    <SidebarRoot collapsible="icon">
      <SidebarHeader>
        <button
          type="button"
          className="saia-brand"
          onClick={() => onCambiarModulo(esAdministrador ? 'dashboard' : 'checklist')}
          title="Ir al inicio de SAIA"
        >
          <span className="saia-brand-logo" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3 4.5 6v5.5c0 4.4 3.1 8.3 7.5 9.5 4.4-1.2 7.5-5.1 7.5-9.5V6L12 3Z" />
              <path d="m8.8 12 2.4 2.4 4.2-4.4" />
            </svg>
          </span>
          <div className="saia-brand-text">
            <span className="saia-brand-title">SAIA</span>
            <span className="saia-brand-subtitle">
              {esAdministrador ? 'Panel Administrador' : 'Portal Operativo'}
            </span>
          </div>
        </button>

        <SidebarTrigger />
      </SidebarHeader>

      <SidebarContent>
        {gruposVisibles.map((grupo) => (
          <SidebarGroup key={grupo.id} collapsible defaultOpen>
            <SidebarGroupLabel>{grupo.titulo}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {grupo.items.map((item) => {
                  const esActivo = moduloActivo === item.id;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={esActivo}
                        tooltip={item.label}
                        onClick={() => onCambiarModulo(item.id)}
                      >
                        <span className="saia-sidebar-menu-icon">{item.icono}</span>
                        <span className="saia-sidebar-menu-label">{item.label}</span>
                        {(() => {
                          const conteo =
                            item.id === 'incidentes'
                              ? totalIncidentes
                              : item.id === 'vencimientos'
                              ? vencimientosVencidos + vencimientosProximos
                              : 0;
                          const esCritico =
                            item.id === 'incidentes'
                              ? incidentesCriticos > 0
                              : item.id === 'vencimientos'
                              ? vencimientosVencidos > 0
                              : false;

                          if (conteo <= 0) return null;
                          return (
                            <SidebarMenuBadge
                              style={{
                                backgroundColor: esCritico ? 'var(--color-error-bg)' : undefined,
                                color: esCritico ? 'var(--color-error-texto)' : undefined,
                                borderColor: esCritico ? 'var(--color-error)' : undefined,
                                fontWeight: 700,
                              }}
                            >
                              {conteo}
                            </SidebarMenuBadge>
                          );
                        })()}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <button
          type="button"
          onClick={alternarTema}
          className="saia-theme-toggle-btn"
          title={tema === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
        >
          <span className="saia-theme-toggle-left">
            <span className="saia-sidebar-menu-icon">
              {tema === 'light' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2m-7.07-14.93 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2m-14.93 7.07 1.41-1.41m11.32-11.32 1.41-1.41" />
                </svg>
              )}
            </span>
            <span className="saia-theme-toggle-label">
              {tema === 'light' ? 'Modo oscuro' : 'Modo claro'}
            </span>
          </span>
          <span className="saia-theme-pill">{tema === 'light' ? 'Claro' : 'Oscuro'}</span>
        </button>

        {usuario && (
          <>
            <div className="saia-user-card" title={`${usuario.nombre} ${usuario.apellido} (@${usuario.usuario})`}>
              <span className="saia-user-avatar">{obtenerIniciales()}</span>
              <div className="saia-user-info">
                <span className="saia-user-name">
                  {usuario.nombre} {usuario.apellido}
                </span>
                <span className="saia-user-meta">@{usuario.usuario}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="saia-logout-btn"
              title="Cerrar sesión"
            >
              <span className="saia-sidebar-menu-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" x2="9" y1="12" y2="12" />
                </svg>
              </span>
              <span className="saia-logout-label">Cerrar sesión</span>
            </button>
          </>
        )}
      </SidebarFooter>

      <SidebarRail />
    </SidebarRoot>
  );
};