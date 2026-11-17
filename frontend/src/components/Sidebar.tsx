import React from 'react';
import { useAuth } from '../auth/useAuth';
import { puedeVerModulo } from '../auth/permisos';
import {
  Sidebar as SidebarRoot,
  SidebarContent,
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
  | 'tipoInsumo'
  | 'unidadesMedida'
  | 'proveedores'
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
  | 'informes'
  | 'planDeCalibracion'
  | 'productos'
  | 'produccion'
  | 'vistaPublica'
  | 'controlesAmbientales';

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
  tipoInsumo: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h16M4 18h12" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  ),
  unidadesMedida: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" />
      <path d="m14.5 12.5 2-2" />
      <path d="m11.5 9.5 2-2" />
      <path d="m8.5 6.5 2-2" />
      <path d="m17.5 15.5 2-2" />
    </svg>
  ),
  proveedores: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
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
  informes: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M12 12v6" />
      <path d="m9 15 3 3 3-3" />
    </svg>
  ),
  vistaPublica: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  controlesAmbientales: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.4 19 2c1 2 2 4.1 2 7 0 4.7-4 9-10 9Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  ),
};

const ICONOS_GRUPO: Record<string, React.ReactNode> = {
  general: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M10 21v-6h4v6" />
    </svg>
  ),
  poes: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.7s-6 6.3-6 10.8a6 6 0 0 0 12 0C18 9 12 2.7 12 2.7Z" />
    </svg>
  ),
  planta: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z" />
      <path d="M6 18h12M6 14h12" />
      <rect width="12" height="12" x="6" y="10" />
    </svg>
  ),
  personal: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <circle cx="8" cy="12" r="2" />
      <path d="M14 10h4M14 14h4" />
    </svg>
  ),
  calidad: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
};

export const Sidebar: React.FC<SidebarProps> = ({ moduloActivo, onCambiarModulo }) => {
  const { esAdministrador } = useAuth();
  const { totalIncidentes, incidentesCriticos, vencimientosVencidos, vencimientosProximos } = useAlertasSistema();

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
        { id: 'tipoInsumo', label: 'Tipos de Insumo', icono: ICONOS_MODULO.tipoInsumo },
        { id: 'unidadesMedida', label: 'Unidades de Medida', icono: ICONOS_MODULO.unidadesMedida },
        { id: 'proveedores', label: 'Proveedores', icono: ICONOS_MODULO.proveedores },
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
        { id: 'informes', label: 'Informe de Inspección', icono: ICONOS_MODULO.informes },
        { id: 'controlesAmbientales', label: 'Controles Sanitarios', icono: ICONOS_MODULO.controlesAmbientales },
      ],
    },
  ];

  const gruposVisibles = gruposBase
    .map((grupo) => ({
      ...grupo,
      items: grupo.items.filter((item) => puedeVerModulo(item.id, esAdministrador)),
    }))
    .filter((grupo) => grupo.items.length > 0);

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
            <SidebarGroupLabel>
              <span className="saia-sidebar-group-titulo">
                <span className="saia-sidebar-group-icono" aria-hidden="true">{ICONOS_GRUPO[grupo.id]}</span>
                {grupo.titulo}
              </span>
            </SidebarGroupLabel>
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

      <SidebarRail />
    </SidebarRoot>
  );
};