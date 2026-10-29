import { useEffect, useState } from 'react';
import NuevoInsumo from './views/insumos/nuevoInsumo';
import { ListadoInsumos } from './views/insumos/listado';
import VerInsumo from './views/insumos/verInsumo';
import EditarInsumo from './views/insumos/editarInsumo';
import type { InsumoConId } from './views/insumos/tipos';
import NuevoEquipo from './views/equipos/nuevoEquipo';
import { ListadoEquipos } from './views/equipos/listado';
import { DetalleEquipo } from './views/equipos/verDetalle';
import EditarEquipo from './views/equipos/editarDetalle';
import { ListadoSectores } from './views/sectores/listado';
import { NuevoSector } from './views/sectores/nuevoSector';
import { EditarSector } from './views/sectores/editarSector';
import { NuevaPersona } from './views/personas/nuevaPersona';
import { ListadoPersonas } from './views/personas/listado';
import { DetallePersona } from './views/personas/verDetalle';
import { EditarPersona } from './views/personas/editarDetalle';
import { ListadoInsumosQuimicos } from './views/insumos_quimicos/listado';
import { NuevoInsumoQuimico } from './views/insumos_quimicos/nuevoInsumoQuimico';
import { EditarDetalle as EditarInsumoQuimico } from './views/insumos_quimicos/editarDetalle';
import { VerDetalle as VerDetalleInsumoQuimico } from './views/insumos_quimicos/verDetalle';
import type { InsumoQuimico } from './views/insumos_quimicos/tipos';
import { ConsumoHistoricoInsumos } from './views/dashboard/ConsumoHistoricoInsumos';

import { Sidebar } from './components/Sidebar';
import { SidebarInset, SidebarProvider } from './components/ui/sidebar';
import { ListadoElementosLimpieza } from './views/elementosDeLimpieza/listado';
import { NuevoElementoDeLimpieza } from './views/elementosDeLimpieza/nuevoElemento';
import { EditarElementoDeLimpieza } from './views/elementosDeLimpieza/editarDetalle';
import { DetalleElementoDeLimpieza } from './views/elementosDeLimpieza/verDetalle';
import NuevoPlanDeLimpieza from './views/planesDeLimpieza/nuevoPlan';
import { ListadoPlanesLimp } from './views/planesDeLimpieza/listado';
import EditarPlanDeLimpieza from './views/planesDeLimpieza/editarPlan';
import { VerPLanDeLimpieza } from './views/planesDeLimpieza/verPlan';
import { ListadoChecklists } from './views/checklist/listado';
import { DetalleChecklist } from './views/checklist/verDetalle';
import { ListadoAuditoria } from './views/auditoria/listado';
import { ListadoIncidentes } from './views/incidentes/listado';
import { IncidentesAbiertos } from './views/incidentes/incidentesAbiertos';
import { NuevoIncidente } from './views/incidentes/nuevoIncidente';
import NuevoPlanDeCalibracion from './views/planDeCalibracion/crearPlanDeCalibracion';
import { ListadoPlanesCalibracion } from './views/planDeCalibracion/listado';
import { Panel as PanelDashboard } from './views/dashboard/panel';
import { EstadisticasIncidentes } from './views/incidentes/estadisticasIncidentes';
import { ListadoCategoriasIncidentes } from './views/incidentes/categorias/listado';
import { NotificacionesPopover } from './components/alertas/NotificacionesPopover';
import type { NotificacionItem } from './hooks/useNotificaciones';
import { ListadoDocumentos } from './views/documentos/listado';
import { DetalleDocumento } from './views/documentos/verDetalle';
import NuevoDocumento from './views/documentos/nuevoDocumento';
import NuevaVersion from './views/documentos/nuevaVersion';
import { Login } from './views/auth/login';
import { useAuth } from './auth/useAuth';
import { moduloInicial, puedeVerModulo } from './auth/permisos';
import { EditarPlanDeCalibracion } from './views/planDeCalibracion/editarPlanDeCalibracion';
import { VerPlanDeCalibracion } from './views/planDeCalibracion/verPlanDeCalibracion';
import { ListadoCertificados } from './views/certificado/listado';
import { ListadoCertificadosPorPersona } from './views/certificado/listadoPorPersona';
import { NuevoCertificado } from './views/certificado/nuevoCertificado';
import { EditarCertificado } from './views/certificado/editarDetalle';
import { DetalleCertificado } from './views/certificado/verDetalle';
import { ListadoTiposCertificados } from './views/tipoCertificado/listado';
import { NuevoTipoCertificado } from './views/tipoCertificado/nuevoTipoCertificado';
import { DetalleTipoCertificado } from './views/tipoCertificado/verDetalle';
import { ListadoTiposDocumentos } from './views/tipoDocumento/listado';
import { NuevoTipoDocumento } from './views/tipoDocumento/nuevoTipoDocumento';
import { DetalleTipoDocumento } from './views/tipoDocumento/verDetalle';
import { VistaConsolidadaVencimiento } from './views/vencimientos/VistaConsolidadaVencimiento';
import { VencimientosDocumentos } from './views/documentos/vencimientosDocumentos';
import './styles/dashboard.css';

type Modulo = 'dashboard' | 'insumos' | 'equipos' | 'sectores' | 'personas' | 'vencimientos' | 'tipoCertificado' | 'tipoDocumento' | 'insumos_quimicos' | 'elementosDeLimpieza' | 'planDeLimpieza' | 'checklist' | 'documentos' | 'incidentes' | 'auditoria' | 'planDeCalibracion';
type VistaSectores = 'listado' | 'alta' | 'editar';
type VistaEquipos = 'listado' | 'alta' | 'detalle' | 'editar';
type VistaInsumos = 'listado' | 'alta' | 'ver' | 'editar';
type VistaPersonas = 'listado' | 'alta' | 'detalle' | 'editar' | 'certificados' | 'nuevo_certificado' | 'editar_certificado' | 'detalle_certificado';
type VistaInsumosQuimicos = 'listado' | 'alta' | 'detalle' | 'editar' | 'consumo_historico';
type VistaElementos = 'listado' | 'alta' | 'detalle' | 'editar' | 'eliminar';
type VistaPlanLimp = 'listado' | 'alta' | 'detalle' | 'editar';
type VistaChecklist = 'listado' | 'detalle';
type VistaPlanCalibracion = 'listado' | 'alta' | 'detalle' | 'editar';
type VistaDocumentos = 'listado' | 'alta' | 'detalle' | 'nuevaVersion';
type VistaTipoCertificado = 'listado' | 'alta' | 'detalle';
type VistaTipoDocumento = 'listado' | 'alta' | 'detalle';

function Aplicacion() {
  const { esAdministrador, esOperador } = useAuth();
  const [moduloElegido, setModulo] = useState<Modulo>(moduloInicial(esAdministrador));
  const modulo = puedeVerModulo(moduloElegido, esAdministrador) ? moduloElegido : moduloInicial(esAdministrador);

  
  const [vistaEquipos, setVistaEquipos] = useState<VistaEquipos>('listado');
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<number | null>(null);

  const [vistaSectores, setVistaSectores] = useState<VistaSectores>('listado');
  const [sectorSeleccionado, setSectorSeleccionado] = useState<number | null>(null);

  
  const [vistaInsumos, setVistaInsumos] = useState<VistaInsumos>('listado');
  const [insumoSeleccionado, setInsumoSeleccionado] = useState<InsumoConId | null>(null);

  
  const [vistaPersonas, setVistaPersonas] = useState<VistaPersonas>('listado');
  const [legajoSeleccionado, setLegajoSeleccionado] = useState<number | null>(null);

  const [nombrePersonaSeleccionada, setNombrePersonaSeleccionada] = useState<string>('');
  const [certificadoSeleccionado, setCertificadoSeleccionado] = useState<number | null>(null);

  const [vistaElementos, setVistaElementos] = useState<VistaElementos>('listado');
  const [elementoSeleccionado, setElementoSeleccionado] = useState<number | null>(null);


  const [vistaInsumosQuimicos, setVistaInsumosQuimicos] = useState<VistaInsumosQuimicos>('listado');
  const [quimicoSeleccionado, setQuimicoSeleccionado] = useState<InsumoQuimico | null>(null);

  const [vistaPlanLimp, setVistaPlanLimp] = useState<VistaPlanLimp>('listado');
  const [planLimpSeleccionado, setPlanLimpSeleccionando] = useState<number | null>(null);

  const [vistaChecklist, setVistaChecklist] = useState<VistaChecklist>('listado');
  const [checklistSeleccionado, setChecklistSeleccionado] = useState<number | null>(null);
  const [vistaIncidentesAdmin, setVistaIncidentesAdmin] = useState<'abiertos' | 'historial' | 'estadisticas' | 'categorias' | 'nuevo'>('abiertos');
  const [vistaVencimientos, setVistaVencimientos] = useState<'consolidado' | 'personal' | 'documentos'>('consolidado');
  const [origenVencimientos, setOrigenVencimientos] = useState<'consolidado' | 'personal' | 'documentos' | null>(null);

  const [vistaPlanCalibracion, setVistaPlanCalibracion] = useState<VistaPlanCalibracion>('listado');
  const [planCalibracionSeleccionado, setPlanCalibracionSeleccionado] = useState<number | null>(null);

  const [vistaDocumentos, setVistaDocumentos] = useState<VistaDocumentos>('listado');
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState<number | null>(null);

  const [vistaTipoCertificado, setVistaTipoCertificado] = useState<VistaTipoCertificado>('listado');
  const [tipoCertificadoSeleccionado, setTipoCertificadoSeleccionado] = useState<number | null>(null);

  const [vistaTipoDocumento, setVistaTipoDocumento] = useState<VistaTipoDocumento>('listado');
  const [tipoDocumentoSeleccionado, setTipoDocumentoSeleccionado] = useState<number | null>(null);

  const [filtroCertificadosInicial, setFiltroCertificadosInicial] = useState<'TODOS' | 'VENCIDOS' | 'PROXIMOS' | 'AL_DIA'>('TODOS');
  const [filtroCalibracionInicial, setFiltroCalibracionInicial] = useState<'TODOS' | 'VENCIDOS' | 'PROXIMOS' | 'AL_DIA'>('TODOS');
  const [filtroElementosInicial, setFiltroElementosInicial] = useState<'TODOS' | 'VENCIDOS' | 'PROXIMOS' | 'AL_DIA'>('TODOS');
  const [filtroDocumentosVencInicial, setFiltroDocumentosVencInicial] = useState<'TODOS' | 'VENCIDOS' | 'PROXIMOS' | 'AL_DIA'>('TODOS');
  const [filtroConsolidadoOrigen, setFiltroConsolidadoOrigen] = useState<'' | 'personal' | 'equipo' | 'documento'>('');
  const [filtroConsolidadoEstado, setFiltroConsolidadoEstado] = useState<'' | 'vencido' | 'proximo' | 'vigente'>('');
  const [desdeDashboard, setDesdeDashboard] = useState(false);

  const cambiarModulo = (nuevoModulo: Modulo, limpiarFiltros: boolean = true, esDesdeDashboard: boolean = false) => {
    setModulo(nuevoModulo);
    setOrigenVencimientos(null);
    setDesdeDashboard(esDesdeDashboard);
    setVistaEquipos('listado');
    setVistaSectores('listado');
    setVistaInsumos('listado');
    setVistaPersonas('listado');
    setVistaInsumosQuimicos('listado');
    setVistaElementos('listado');
    setVistaPlanLimp('listado');
    setVistaChecklist('listado');
    setVistaIncidentesAdmin('abiertos');
    setVistaVencimientos('consolidado');
    setVistaPlanCalibracion('listado');
    setVistaDocumentos('listado');
    setCertificadoSeleccionado(null);
    setVistaTipoCertificado('listado');
    setVistaTipoDocumento('listado');
    setTipoDocumentoSeleccionado(null);
    if (limpiarFiltros) {
      setFiltroCertificadosInicial('TODOS');
      setFiltroCalibracionInicial('TODOS');
      setFiltroElementosInicial('TODOS');
      setFiltroDocumentosVencInicial('TODOS');
      setFiltroConsolidadoOrigen('');
      setFiltroConsolidadoEstado('');
    }
  };

  const volverAlDashboard = () => {
    cambiarModulo('dashboard', true, false);
  };

  const volverAVencimientos = () => {
    const tabDestino = origenVencimientos || 'consolidado';
    setOrigenVencimientos(null);
    setVistaPersonas('listado');
    setVistaPlanCalibracion('listado');
    setVistaDocumentos('listado');
    setVistaVencimientos(tabDestino);
    setModulo('vencimientos');
  };

interface RegistroVencimientoRef {
  origen?: string;
  tipo?: string;
  referenciaId?: number;
  referencia_id?: number;
  responsable?: string;
}

  const irAlRegistroDeVencimiento = (v: RegistroVencimientoRef) => {
    const origen = v.origen || v.tipo;
    const refId = v.referenciaId ?? v.referencia_id ?? null;
    setOrigenVencimientos('consolidado');
    if (origen === 'personal') {
      const [apellido, nombre] = (v.responsable ?? '').split(', ');
      setModulo('personas');
      setLegajoSeleccionado(refId);
      setNombrePersonaSeleccionada(nombre ? `${nombre} ${apellido}` : (v.responsable ?? ''));
      setVistaPersonas('certificados');
    } else if (origen === 'equipo') {
      setModulo('planDeCalibracion');
      setPlanCalibracionSeleccionado(refId);
      setVistaPlanCalibracion('detalle');
    } else if (origen === 'documento') {
      setModulo('documentos');
      setDocumentoSeleccionado(refId);
      setVistaDocumentos('detalle');
    }
  };

  const irAVerInsumo = (insumo: InsumoConId) => {
    setInsumoSeleccionado(insumo);
    setVistaInsumos('ver');
  };

  const irAEditarInsumo = (insumo: InsumoConId) => {
    setInsumoSeleccionado(insumo);
    setVistaInsumos('editar');
  };

  const volverAListadoInsumos = () => {
    setInsumoSeleccionado(null);
    setVistaInsumos('listado');
  };

  const volverAListadoQuimicos = () => {
    setQuimicoSeleccionado(null);
    setVistaInsumosQuimicos('listado');
  };

  const irACertificadosDePersona = (legajo: number, nombreCompleto: string) => {
    setOrigenVencimientos('personal');
    setLegajoSeleccionado(legajo);
    setNombrePersonaSeleccionada(nombreCompleto);
    setVistaPersonas('certificados');
    setModulo('personas');
  };

  const renderBreadcrumb = () => {
    if (!desdeDashboard || modulo === 'dashboard') return null;

    const breadcrumbMaxWidth =
      modulo === 'vencimientos' ? '1260px' : modulo === 'incidentes' ? '1240px' : '1180px';
    const breadcrumbPadding =
      modulo === 'vencimientos' || modulo === 'incidentes' ? '0 0.5rem' : '0 1.5rem';

    return (
      <div
        className="dashboard-breadcrumb-wrapper"
        style={{
          maxWidth: breadcrumbMaxWidth,
          padding: breadcrumbPadding,
        }}
      >
        <nav className="dashboard-breadcrumb" aria-label="Breadcrumb">
          <button
            type="button"
            className="dashboard-breadcrumb-link"
            onClick={volverAlDashboard}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="7" height="9" x="3" y="3" rx="1.5" />
              <rect width="7" height="5" x="14" y="3" rx="1.5" />
              <rect width="7" height="9" x="14" y="12" rx="1.5" />
              <rect width="7" height="5" x="3" y="16" rx="1.5" />
            </svg>
            Inicio
          </button>
          <span className="dashboard-breadcrumb-separador">/</span>

          {origenVencimientos ? (
            <>
              <button
                type="button"
                className="dashboard-breadcrumb-link"
                onClick={volverAVencimientos}
              >
                {origenVencimientos === 'personal'
                  ? 'Vencimientos de Personal'
                  : origenVencimientos === 'documentos'
                  ? 'Vencimientos de Documentos'
                  : 'Todos los Vencimientos'}
              </button>
              <span className="dashboard-breadcrumb-separador">/</span>

              {modulo === 'personas' ? (
                vistaPersonas === 'certificados' ? (
                  <span className="dashboard-breadcrumb-actual">
                    {nombrePersonaSeleccionada ? `Certificados · ${nombrePersonaSeleccionada}` : 'Certificados'}
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      className="dashboard-breadcrumb-link"
                      onClick={() => setVistaPersonas('certificados')}
                    >
                      {nombrePersonaSeleccionada ? `Certificados · ${nombrePersonaSeleccionada}` : 'Certificados'}
                    </button>
                    <span className="dashboard-breadcrumb-separador">/</span>
                    <span className="dashboard-breadcrumb-actual">
                      {vistaPersonas === 'nuevo_certificado'
                        ? 'Nuevo Certificado'
                        : vistaPersonas === 'editar_certificado'
                        ? 'Editar Certificado'
                        : 'Detalle de Certificado'}
                    </span>
                  </>
                )
              ) : modulo === 'documentos' ? (
                <span className="dashboard-breadcrumb-actual">Detalle de Documento</span>
              ) : modulo === 'planDeCalibracion' ? (
                <span className="dashboard-breadcrumb-actual">Detalle de Calibración</span>
              ) : (
                <span className="dashboard-breadcrumb-actual">Detalle</span>
              )}
            </>
          ) : modulo === 'vencimientos' ? (
            <span className="dashboard-breadcrumb-actual">
              {vistaVencimientos === 'personal'
                ? 'Vencimientos de Personal'
                : vistaVencimientos === 'documentos'
                ? 'Vencimientos de Documentos'
                : 'Todos los Vencimientos'}
            </span>
          ) : modulo === 'planDeCalibracion' ? (
            vistaPlanCalibracion === 'listado' ? (
              <span className="dashboard-breadcrumb-actual">Calibraciones de Equipos</span>
            ) : (
              <>
                <button
                  type="button"
                  className="dashboard-breadcrumb-link"
                  onClick={() => setVistaPlanCalibracion('listado')}
                >
                  Calibraciones de Equipos
                </button>
                <span className="dashboard-breadcrumb-separador">/</span>
                <span className="dashboard-breadcrumb-actual">
                  {vistaPlanCalibracion === 'alta'
                    ? 'Nuevo Plan de Calibración'
                    : vistaPlanCalibracion === 'editar'
                    ? 'Editar Plan de Calibración'
                    : 'Detalle de Plan de Calibración'}
                </span>
              </>
            )
          ) : modulo === 'elementosDeLimpieza' ? (
            vistaElementos === 'listado' ? (
              <span className="dashboard-breadcrumb-actual">Recambio de Elementos</span>
            ) : (
              <>
                <button
                  type="button"
                  className="dashboard-breadcrumb-link"
                  onClick={() => setVistaElementos('listado')}
                >
                  Recambio de Elementos
                </button>
                <span className="dashboard-breadcrumb-separador">/</span>
                <span className="dashboard-breadcrumb-actual">
                  {vistaElementos === 'alta'
                    ? 'Nuevo Elemento'
                    : vistaElementos === 'editar'
                    ? 'Editar Elemento'
                    : 'Detalle de Elemento'}
                </span>
              </>
            )
          ) : modulo === 'incidentes' ? (
            vistaIncidentesAdmin === 'abiertos' ? (
              <span className="dashboard-breadcrumb-actual">Incidentes Abiertos</span>
            ) : (
              <>
                <button
                  type="button"
                  className="dashboard-breadcrumb-link"
                  onClick={() => setVistaIncidentesAdmin('abiertos')}
                >
                  Incidentes Abiertos
                </button>
                <span className="dashboard-breadcrumb-separador">/</span>
                <span className="dashboard-breadcrumb-actual">
                  {vistaIncidentesAdmin === 'historial' ? 'Historial de Incidentes' : 'Nuevo Incidente'}
                </span>
              </>
            )
          ) : modulo === 'tipoDocumento' ? (
            vistaTipoDocumento === 'listado' ? (
              <span className="dashboard-breadcrumb-actual">Tipos de Documentos</span>
            ) : (
              <>
                <button
                  type="button"
                  className="dashboard-breadcrumb-link"
                  onClick={() => setVistaTipoDocumento('listado')}
                >
                  Tipos de Documentos
                </button>
                <span className="dashboard-breadcrumb-separador">/</span>
                <span className="dashboard-breadcrumb-actual">
                  {vistaTipoDocumento === 'alta' ? 'Nuevo Tipo de Documento' : 'Detalle Tipo de Documento'}
                </span>
              </>
            )
          ) : (
            <span className="dashboard-breadcrumb-actual">{modulo}</span>
          )}
        </nav>
      </div>
    );
  };

const irANotificacion = (notif: NotificacionItem) => {
    const { entidad_tipo, entidad_id, tipo } = notif;

    if (entidad_tipo === 'personal' && entidad_id && esAdministrador) {
      setModulo('personas');
      setLegajoSeleccionado(entidad_id);
      setVistaPersonas('certificados');
      return;
    }

    if (entidad_tipo === 'equipo' && entidad_id && esAdministrador) {
      setModulo('planDeCalibracion');
      setPlanCalibracionSeleccionado(entidad_id);
      setVistaPlanCalibracion('detalle');
      return;
    }

    if (entidad_tipo === 'documento' && entidad_id) {
      setModulo('documentos');
      setDocumentoSeleccionado(entidad_id);
      setVistaDocumentos('detalle');
      return;
    }

    if (entidad_tipo === 'elemento_limpieza' && esAdministrador) {
      setModulo('elementosDeLimpieza');
      if (entidad_id) {
        setElementoSeleccionado(entidad_id);
        setVistaElementos('detalle');
      } else {
        setVistaElementos('listado');
      }
      return;
    }

    if (entidad_tipo === 'insumo_quimico' && esAdministrador) {
      setModulo('insumos_quimicos');
      setVistaInsumosQuimicos('listado');
      return;
    }

    if (entidad_tipo === 'checklist' && entidad_id) {
      setModulo('checklist');
      setChecklistSeleccionado(entidad_id);
      setVistaChecklist('detalle');
      return;
    }

    if (entidad_tipo === 'tarea') {
      setModulo('checklist');
      setVistaChecklist('listado');
      return;
    }

    if ((entidad_tipo === 'incidente' || tipo === 'incidente_critico' || tipo === 'evento_incidente') && esAdministrador) {
      setModulo('incidentes');
      setVistaIncidentesAdmin('abiertos');
      return;
    }

    if (tipo.startsWith('vencimiento_') && esAdministrador) {
      cambiarModulo('vencimientos');
      return;
    }

    if (tipo === 'evento_stock_quimico' && esAdministrador) {
      cambiarModulo('insumos_quimicos');
      return;
    }

    if (tipo === 'evento_tarea_revision' || tipo === 'evento_tarea_reasignada') {
      cambiarModulo('checklist');
      return;
    }
  };

  return (
    <SidebarProvider>
      <Sidebar moduloActivo={modulo} onCambiarModulo={cambiarModulo} />

      <SidebarInset style={{ padding: modulo === 'dashboard' ? '14px 24px' : '32px 36px', position: 'relative' }}>
        <div
          className="saia-top-campana"
          style={{
            position: 'absolute',
            top: modulo === 'dashboard' ? '14px' : '24px',
            right: '36px',
            zIndex: 50,
          }}
        >
          <NotificacionesPopover
            onNavegar={irANotificacion}
            onIrAIncidentes={() => cambiarModulo('incidentes')}
            onIrAVencimientos={() => cambiarModulo('vencimientos')}
          />
        </div>

        {renderBreadcrumb()}
        {modulo === 'dashboard' ? (
          <PanelDashboard
            onIrAlRegistro={irAlRegistroDeVencimiento}
            onNavegar={(mod, subvista, filtroEstado) => {
              if (mod === 'vencimientos') {
                cambiarModulo('vencimientos', false, true);
                if (subvista === 'personal') {
                  setVistaVencimientos('personal');
                  setFiltroCertificadosInicial(
                    filtroEstado === 'VENCIDOS' || filtroEstado === 'PROXIMOS' || filtroEstado === 'AL_DIA'
                      ? filtroEstado
                      : 'TODOS'
                  );
                } else if (subvista === 'documentos' || subvista === 'documento') {
                  setVistaVencimientos('documentos');
                  setFiltroDocumentosVencInicial(
                    filtroEstado === 'VENCIDOS' || filtroEstado === 'PROXIMOS' || filtroEstado === 'AL_DIA'
                      ? filtroEstado
                      : filtroEstado === 'vencido'
                      ? 'VENCIDOS'
                      : filtroEstado === 'proximo'
                      ? 'PROXIMOS'
                      : 'TODOS'
                  );
                } else {
                  setVistaVencimientos('consolidado');
                  setFiltroConsolidadoOrigen(subvista === 'equipo' || subvista === 'personal' || subvista === 'documento' ? subvista : '');
                  setFiltroConsolidadoEstado(filtroEstado === 'vencido' || filtroEstado === 'proximo' || filtroEstado === 'vigente' ? filtroEstado : '');
                }
              } else if (mod === 'planDeCalibracion') {
                cambiarModulo('planDeCalibracion', false, true);
                setFiltroCalibracionInicial(
                  filtroEstado === 'VENCIDOS' || filtroEstado === 'PROXIMOS' || filtroEstado === 'AL_DIA'
                    ? filtroEstado
                    : 'TODOS'
                );
              } else if (mod === 'elementosDeLimpieza') {
                cambiarModulo('elementosDeLimpieza', false, true);
                setFiltroElementosInicial(
                  filtroEstado === 'VENCIDOS' || filtroEstado === 'PROXIMOS' || filtroEstado === 'AL_DIA'
                    ? filtroEstado
                    : 'TODOS'
                );
              } else {
                cambiarModulo(mod as Modulo, true, true);
              }
            }}
          />
        ) : modulo === 'vencimientos' ? (
          vistaVencimientos === 'consolidado' ? (
            <VistaConsolidadaVencimiento
              key={`consolidado-${filtroConsolidadoOrigen}-${filtroConsolidadoEstado}`}
              onIrAlRegistro={irAlRegistroDeVencimiento}
              onVerSoloPersonal={() => setVistaVencimientos('personal')}
              onVerSoloDocumentos={() => setVistaVencimientos('documentos')}
              filtroOrigenInicial={filtroConsolidadoOrigen}
              filtroEstadoInicial={filtroConsolidadoEstado}
            />
          ) : vistaVencimientos === 'personal' ? (
            <ListadoCertificados
              key={`certificados-${filtroCertificadosInicial}`}
              onVerPersona={irACertificadosDePersona}
              onVerConsolidado={() => setVistaVencimientos('consolidado')}
              onVerSoloDocumentos={() => setVistaVencimientos('documentos')}
              filtroEstadoInicial={filtroCertificadosInicial}
            />
          ) : (
            <VencimientosDocumentos
              key={`documentos-venc-${filtroDocumentosVencInicial}`}
              onVerDocumento={(id) => {
                setOrigenVencimientos('documentos');
                setModulo('documentos');
                setDocumentoSeleccionado(id);
                setVistaDocumentos('detalle');
              }}
              onVerConsolidado={() => setVistaVencimientos('consolidado')}
              onVerSoloPersonal={() => setVistaVencimientos('personal')}
              filtroEstadoInicial={filtroDocumentosVencInicial}
            />
          )
        ) : modulo === 'insumos' ? (
          vistaInsumos === 'listado' ? (
            <ListadoInsumos
              onNuevoClick={() => setVistaInsumos('alta')}
              onVerClick={irAVerInsumo}
              onEditarClick={irAEditarInsumo}
            />
          ) : vistaInsumos === 'alta' ? (
            <NuevoInsumo
              onSuccess={volverAListadoInsumos}
              onCancel={volverAListadoInsumos}
            />
          ) : vistaInsumos === 'ver' && insumoSeleccionado ? (
            <VerInsumo
              insumo={insumoSeleccionado}
              onEditarClick={irAEditarInsumo}
              onVolver={volverAListadoInsumos}
            />
          ) : insumoSeleccionado ? (
            <EditarInsumo
              insumo={insumoSeleccionado}
              onSuccess={volverAListadoInsumos}
              onCancel={volverAListadoInsumos}
            />
          ) : null
        ) : modulo === 'equipos' ? (
          vistaEquipos === 'listado' ? (
            <ListadoEquipos
              onNuevoClick={() => setVistaEquipos('alta')}
              onDetalleClick={(id) => {
                setEquipoSeleccionado(id);
                setVistaEquipos('detalle');
              }}
              onEditarClick={(id) => {
                setEquipoSeleccionado(id);
                setVistaEquipos('editar');
              }}
            />
          ) : vistaEquipos === 'alta' ? (
            <NuevoEquipo
              onSuccess={() => setVistaEquipos('listado')}
              onCancel={() => setVistaEquipos('listado')}
            />
          ) : vistaEquipos === 'detalle' ? (
            <DetalleEquipo
              equipoId={equipoSeleccionado}
              onCancel={() => setVistaEquipos('listado')}
            />
          ) : (
            <EditarEquipo
              equipoId={equipoSeleccionado}
              onSuccess={() => setVistaEquipos('listado')}
              onCancel={() => setVistaEquipos('listado')}
            />
          )
        ) : modulo === 'sectores' ? (
          vistaSectores === 'listado' ? (
            <ListadoSectores
              onNuevoClick={() => setVistaSectores('alta')}
              onEditarClick={(id) => {
                setSectorSeleccionado(id);
                setVistaSectores('editar');
              }}
            />
          ) : vistaSectores === 'alta' ? (
            <NuevoSector
              onSuccess={() => setVistaSectores('listado')}
              onCancel={() => setVistaSectores('listado')}
            />
          ) : (
            <EditarSector
              sectorId={sectorSeleccionado}
              onSuccess={() => setVistaSectores('listado')}
              onCancel={() => setVistaSectores('listado')}
            />
          )
        ) : modulo === 'personas' ? (
          vistaPersonas === 'listado' ? (
            <ListadoPersonas
              onNuevoClick={() => setVistaPersonas('alta')}
              onDetalleClick={(legajo) => {
                setLegajoSeleccionado(legajo);
                setVistaPersonas('detalle');
              }}
              onEditarClick={(legajo) => {
                setLegajoSeleccionado(legajo);
                setVistaPersonas('editar');
              }}
              onVerCertificados={(legajo, nombreCompleto) => {
                setOrigenVencimientos(null);
                setLegajoSeleccionado(legajo);
                setNombrePersonaSeleccionada(nombreCompleto);
                setVistaPersonas('certificados');
              }}
            />
          ) : vistaPersonas === 'alta' ? (
            <NuevaPersona
              onSuccess={() => setVistaPersonas('listado')}
              onCancel={() => setVistaPersonas('listado')}
            />
          ) : vistaPersonas === 'detalle' ? (
            <DetallePersona
              personaLegajo={legajoSeleccionado}
              onCancel={() => setVistaPersonas('listado')}
            />
          ) : vistaPersonas === 'editar'? (
            <EditarPersona
              personaLegajo={legajoSeleccionado}
              onSuccess={() => setVistaPersonas('listado')}
              onCancel={() => setVistaPersonas('listado')}
            />
          ) : vistaPersonas === 'certificados' && legajoSeleccionado !== null ? (
            <ListadoCertificadosPorPersona
              legajoPersona={legajoSeleccionado}
              nombrePersona={nombrePersonaSeleccionada}
              onNuevoClick={() => setVistaPersonas('nuevo_certificado')}
              onDetalleClick={(id) => {
                setCertificadoSeleccionado(id);
                setVistaPersonas('detalle_certificado');
              }}
              onEditarClick={(id) => {
                setCertificadoSeleccionado(id);
                setVistaPersonas('editar_certificado');
              }}
              onVolver={origenVencimientos ? volverAVencimientos : () => setVistaPersonas('listado')}
              textoVolver={origenVencimientos ? '← Volver a Vencimientos' : '← Volver a Personal'}
            />
          ) : vistaPersonas === 'nuevo_certificado' && legajoSeleccionado !== null ? (
            <NuevoCertificado
              legajoPersona={legajoSeleccionado}
              onSuccess={() => setVistaPersonas('certificados')}
              onCancel={() => setVistaPersonas('certificados')}
            />
          ) : vistaPersonas === 'editar_certificado' && certificadoSeleccionado !== null ? (
            <EditarCertificado
              certificadoId={certificadoSeleccionado}
              onSuccess={() => setVistaPersonas('certificados')}
              onCancel={() => setVistaPersonas('certificados')}
            />
          ) : vistaPersonas === 'detalle_certificado' && certificadoSeleccionado !== null ? (
            <DetalleCertificado
              certificadoId={certificadoSeleccionado}
              onCancel={() => setVistaPersonas('certificados')}
            />
          ) : null
        ) : modulo === 'insumos_quimicos' ? (
          vistaInsumosQuimicos === 'listado' ? (
            <ListadoInsumosQuimicos
              onNuevo={() => setVistaInsumosQuimicos('alta')}
              onEditar={(insumo) => {
                setQuimicoSeleccionado(insumo);
                setVistaInsumosQuimicos('editar');
              }}
              onVerDetalle={(insumo) => {
                setQuimicoSeleccionado(insumo);
                setVistaInsumosQuimicos('detalle');
              }}
              onVerConsumoHistorico={(insumo) => {
                if (insumo) {
                  setQuimicoSeleccionado(insumo);
                } else {
                  setQuimicoSeleccionado(null);
                }
                setVistaInsumosQuimicos('consumo_historico');
              }}
            />
          ) : vistaInsumosQuimicos === 'alta' ? (
            <NuevoInsumoQuimico
              onVolver={volverAListadoQuimicos}
              onCreado={volverAListadoQuimicos}
            />
          ) : vistaInsumosQuimicos === 'detalle' && quimicoSeleccionado ? (
            <VerDetalleInsumoQuimico
              insumo={quimicoSeleccionado}
              onVolver={volverAListadoQuimicos}
              onEditar={() => setVistaInsumosQuimicos('editar')}
            />
          ) : vistaInsumosQuimicos === 'editar' && quimicoSeleccionado ? (
            <EditarInsumoQuimico
              insumo={quimicoSeleccionado}
              onVolver={volverAListadoQuimicos}
              onActualizado={volverAListadoQuimicos}
            />
          ) : vistaInsumosQuimicos === 'consumo_historico' ? (
            <ConsumoHistoricoInsumos
              onVolver={volverAListadoQuimicos}
              insumoIdInicial={quimicoSeleccionado?.id}
            />
          ) : null
        ) : modulo === 'elementosDeLimpieza' ? (
          vistaElementos === 'listado' ? (
            <ListadoElementosLimpieza
              key={`elementos-${filtroElementosInicial}`}
              filtroVencimientoInicial={filtroElementosInicial}
              onNuevoClick={() => setVistaElementos('alta')}
              onDetalleClick={(id) => {
                setElementoSeleccionado(id);
                setVistaElementos('detalle');
              }}
              onEditarClick={(id) => {
                setElementoSeleccionado(id);
                setVistaElementos('editar');
              }}
            />
          ) : vistaElementos === 'alta' ? (
            <NuevoElementoDeLimpieza
              onSuccess={() => setVistaElementos('listado')}
              onCancel={() => setVistaElementos('listado')}
            />
          ) : vistaElementos === 'detalle' ? (
            <DetalleElementoDeLimpieza
              elementoId={elementoSeleccionado}
              onCancel={() => setVistaElementos('listado')}
            />
          ) : vistaElementos === 'editar' ? (
            <EditarElementoDeLimpieza
              elementoId={elementoSeleccionado}
              onSuccess={() => setVistaElementos('listado')}
              onCancel={() => setVistaElementos('listado')}
            />
          ) : null
        ) : modulo === 'planDeLimpieza' ? (
          vistaPlanLimp === 'listado' ? (
            <ListadoPlanesLimp
              onNuevoClick={() => setVistaPlanLimp('alta')}
              onDetalleClick={(id) => {
                setPlanLimpSeleccionando(id);
                setVistaPlanLimp('detalle');
              }}
              onEditarClick={(id) => {
                setPlanLimpSeleccionando(id);
                setVistaPlanLimp('editar');
              }}
            />
          ) : vistaPlanLimp === 'alta' ? (
            <NuevoPlanDeLimpieza
              onSuccess={() => setVistaPlanLimp('listado')}
              onCancel={() => setVistaPlanLimp('listado')}
            />
          ) : vistaPlanLimp === 'editar' ? (
            <EditarPlanDeLimpieza
              planlimpiezaID={planLimpSeleccionado}
              onSuccess={() => setVistaPlanLimp('listado')}
              onCancel={() => setVistaPlanLimp('listado')}
            />
          ) : vistaPlanLimp === 'detalle' ? (
            <VerPLanDeLimpieza
              onCancel={() => setVistaPlanLimp('listado')}
              planlimpiezaID={planLimpSeleccionado}
            />
          ) : null
        ) : modulo === 'auditoria' ? (
          <ListadoAuditoria />
        ) : modulo === 'incidentes' ? (
          esAdministrador ? (
            vistaIncidentesAdmin === 'nuevo' && esOperador ? (
              <NuevoIncidente onCancel={() => setVistaIncidentesAdmin('abiertos')} />
            ) : vistaIncidentesAdmin === 'historial' ? (
              <ListadoIncidentes
                onVerAbiertos={() => setVistaIncidentesAdmin('abiertos')}
                onVerEstadisticas={() => setVistaIncidentesAdmin('estadisticas')}
                onVerCategorias={() => setVistaIncidentesAdmin('categorias')}
                onRegistrarClick={esOperador ? () => setVistaIncidentesAdmin('nuevo') : undefined}
              />
            ) : vistaIncidentesAdmin === 'estadisticas' ? (
              <EstadisticasIncidentes
                onVerAbiertos={() => setVistaIncidentesAdmin('abiertos')}
                onVerHistorial={() => setVistaIncidentesAdmin('historial')}
                onVerCategorias={() => setVistaIncidentesAdmin('categorias')}
              />
            ) : vistaIncidentesAdmin === 'categorias' ? (
              <ListadoCategoriasIncidentes
                onVerAbiertos={() => setVistaIncidentesAdmin('abiertos')}
                onVerHistorial={() => setVistaIncidentesAdmin('historial')}
                onVerEstadisticas={() => setVistaIncidentesAdmin('estadisticas')}
              />
            ) : (
              <IncidentesAbiertos
                onVerHistorialCompleto={() => setVistaIncidentesAdmin('historial')}
                onVerEstadisticas={() => setVistaIncidentesAdmin('estadisticas')}
                onVerCategorias={() => setVistaIncidentesAdmin('categorias')}
                onRegistrarClick={esOperador ? () => setVistaIncidentesAdmin('nuevo') : undefined}
              />
            )
          ) : (
            <NuevoIncidente />
          )
        ) : modulo === 'documentos' ? (
          vistaDocumentos === 'listado' ? (
            <ListadoDocumentos
              onNuevoClick={esAdministrador ? () => setVistaDocumentos('alta') : undefined}
              onNuevaVersionClick={esAdministrador ? (id) => {
                setDocumentoSeleccionado(id);
                setVistaDocumentos('nuevaVersion');
              } : undefined}
              onDetalleClick={(id) => {
                setOrigenVencimientos(null);
                setDocumentoSeleccionado(id);
                setVistaDocumentos('detalle');
              }}
            />
          ) : vistaDocumentos === 'alta' && esAdministrador ? (
            <NuevoDocumento
              onSuccess={() => setVistaDocumentos('listado')}
              onCancel={() => setVistaDocumentos('listado')}
            />
          ) : vistaDocumentos === 'nuevaVersion' && esAdministrador ? (
            <NuevaVersion
              documentoId={documentoSeleccionado}
              onSuccess={() => setVistaDocumentos('listado')}
              onCancel={() => setVistaDocumentos('listado')}
            />
          ) : (
            <DetalleDocumento
              documentoId={documentoSeleccionado}
              onVolver={origenVencimientos ? volverAVencimientos : () => setVistaDocumentos('listado')}
              textoVolver={origenVencimientos ? '← Volver a Vencimientos' : 'Volver'}
            />
          )
        ) : modulo === 'checklist' ? (
          vistaChecklist === 'listado' ? (
            <ListadoChecklists
              onDetalleClick={(id) => {
                setChecklistSeleccionado(id);
                setVistaChecklist('detalle');
              }}
            />
          ) : (
            <DetalleChecklist
              checklistId={checklistSeleccionado}
              onVolver={() => setVistaChecklist('listado')}
            />
          )
        ) : modulo === 'planDeCalibracion' ? (
          vistaPlanCalibracion === 'listado' ? (
            <ListadoPlanesCalibracion
              key={`calibracion-${filtroCalibracionInicial}`}
              filtroEstadoInicial={filtroCalibracionInicial}
              onNuevoClick={() => setVistaPlanCalibracion('alta')}
              onDetalleClick={(id) => {
                setOrigenVencimientos(null);
                setPlanCalibracionSeleccionado(id);
                setVistaPlanCalibracion('detalle');
              }}
              onEditarClick={(id) => {
                setOrigenVencimientos(null);
                setPlanCalibracionSeleccionado(id);
                setVistaPlanCalibracion('editar');
              }}
            />
          ) : vistaPlanCalibracion === 'alta' ? (
            <NuevoPlanDeCalibracion           
              onSuccess={() => setVistaPlanCalibracion('listado')}
              onCancel={() => setVistaPlanCalibracion('listado')}
            />
          ) : vistaPlanCalibracion === 'editar' ? (
            <EditarPlanDeCalibracion
              planId={planCalibracionSeleccionado}
              onSuccess={() => setVistaPlanCalibracion('listado')}
              onCancel={() => setVistaPlanCalibracion('listado')}
            />
          ) : vistaPlanCalibracion === 'detalle' ? (
            <VerPlanDeCalibracion
              onCancel={origenVencimientos ? volverAVencimientos : () => setVistaPlanCalibracion('listado')}
              textoVolver={origenVencimientos ? '← Volver a Vencimientos' : 'Volver'}
              planCalibracionID={planCalibracionSeleccionado}
            />
          ) : null
        ) : modulo === 'tipoCertificado' ? (
          vistaTipoCertificado === 'listado' ? (
            <ListadoTiposCertificados
              onNuevoClick={() => setVistaTipoCertificado('alta')}
              onDetalleClick={(id) => {
                setTipoCertificadoSeleccionado(id);
                setVistaTipoCertificado('detalle');
              }}
            />
          ) : vistaTipoCertificado === 'alta' ? (
            <NuevoTipoCertificado
              onSuccess={() => setVistaTipoCertificado('listado')}
              onCancel={() => setVistaTipoCertificado('listado')}
            />
          ) : vistaTipoCertificado === 'detalle' ? (
            <DetalleTipoCertificado
              tipoId={tipoCertificadoSeleccionado}
              onCancel={() => setVistaTipoCertificado('listado')}
            />
          ) : null
        ) : modulo === 'tipoDocumento' ? (
          vistaTipoDocumento === 'listado' ? (
            <ListadoTiposDocumentos
              onNuevoClick={() => setVistaTipoDocumento('alta')}
              onDetalleClick={(id) => {
                setTipoDocumentoSeleccionado(id);
                setVistaTipoDocumento('detalle');
              }}
            />
          ) : vistaTipoDocumento === 'alta' ? (
            <NuevoTipoDocumento
              onSuccess={() => setVistaTipoDocumento('listado')}
              onCancel={() => setVistaTipoDocumento('listado')}
            />
          ) : vistaTipoDocumento === 'detalle' ? (
            <DetalleTipoDocumento
              tipoId={tipoDocumentoSeleccionado}
              onCancel={() => setVistaTipoDocumento('listado')}
            />
          ) : null
        ) : null}
      </SidebarInset>
    </SidebarProvider>
  );
}

function App() {
  const { usuario, cargando } = useAuth();

  useEffect(() => {
    const temaGuardado = (localStorage.getItem('saia_tema') as 'light' | 'dark') || 'light';
    document.documentElement.setAttribute('data-theme', temaGuardado);
  }, []);

  if (cargando) return null;
  return usuario ? <Aplicacion /> : <Login />;
}

export default App;
