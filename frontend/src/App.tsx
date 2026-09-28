import { useState } from 'react';
import NuevoInsumo from './views/insumos/nuevoInsumo';
import { ListadoInsumos } from './views/insumos/listado';
import VerInsumo from './views/insumos/verInsumo';
import EditarInsumo from './views/insumos/editarInsumo';
import type { InsumoConId } from './views/insumos/tipos';
import NuevoEquipo from './views/equipos/nuevoEquipo';
import { ListadoEquipos } from './views/equipos/listado';
import { DetalleEquipo } from './views/equipos/verDetalle';
import EditarEquipo from './views/equipos/editarDetalle';
import { NuevaPersona } from './views/personas/nuevaPersona';
import { ListadoPersonas } from './views/personas/listado';
import { DetallePersona } from './views/personas/verDetalle';
import { EditarPersona } from './views/personas/editarDetalle';
import { ListadoInsumosQuimicos } from './views/insumos_quimicos/listado';
import { NuevoInsumoQuimico } from './views/insumos_quimicos/nuevoInsumoQuimico';
import { EditarDetalle as EditarInsumoQuimico } from './views/insumos_quimicos/editarDetalle';
import { VerDetalle as VerDetalleInsumoQuimico } from './views/insumos_quimicos/verDetalle';
import type { InsumoQuimico } from './views/insumos_quimicos/tipos';

import { Sidebar } from './components/Sidebar';
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
import { Panel as PanelDashboard } from './views/dashboard/panel';

type Modulo = 'dashboard' | 'insumos' | 'equipos' | 'personas' | 'insumos_quimicos' | 'elementosDeLimpieza' | 'planDeLimpieza' | 'checklist' | 'auditoria';
type VistaEquipos = 'listado' | 'alta' | 'detalle' | 'editar';
type VistaInsumos = 'listado' | 'alta' | 'ver' | 'editar';
type VistaPersonas = 'listado' | 'alta' | 'detalle' | 'editar';
type VistaInsumosQuimicos = 'listado' | 'alta' | 'detalle' | 'editar';
type VistaElementos = 'listado' | 'alta' | 'detalle' | 'editar' | 'eliminar';
type VistaPlanLimp = 'listado' | 'alta' | 'detalle' | 'editar';
type VistaChecklist = 'listado' | 'detalle';

function App() {
  const [modulo, setModulo] = useState<Modulo>('dashboard');

  
  const [vistaEquipos, setVistaEquipos] = useState<VistaEquipos>('listado');
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<number | null>(null);

  
  const [vistaInsumos, setVistaInsumos] = useState<VistaInsumos>('listado');
  const [insumoSeleccionado, setInsumoSeleccionado] = useState<InsumoConId | null>(null);

  
  const [vistaPersonas, setVistaPersonas] = useState<VistaPersonas>('listado');
  const [legajoSeleccionado, setLegajoSeleccionado] = useState<number | null>(null);
  const [vistaElementos, setVistaElementos] = useState<VistaElementos>('listado');
  const [elementoSeleccionado, setElementoSeleccionado] = useState<number | null>(null);


  const [vistaInsumosQuimicos, setVistaInsumosQuimicos] = useState<VistaInsumosQuimicos>('listado');
  const [quimicoSeleccionado, setQuimicoSeleccionado] = useState<InsumoQuimico | null>(null);

  const [vistaPlanLimp, setVistaPlanLimp] = useState<VistaPlanLimp>('listado');
  const [planLimpSeleccionado, setPlanLimpSeleccionando] = useState<number | null>(null);

  const [vistaChecklist, setVistaChecklist] = useState<VistaChecklist>('listado');
  const [checklistSeleccionado, setChecklistSeleccionado] = useState<number | null>(null);

  const cambiarModulo = (nuevoModulo: Modulo) => {
    setModulo(nuevoModulo);
    setVistaEquipos('listado');
    setVistaInsumos('listado');
    setVistaPersonas('listado');
    setVistaInsumosQuimicos('listado');
    setVistaElementos('listado');
    setVistaPlanLimp('listado');
    setVistaChecklist('listado');
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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', display: 'flex' }}>
      <Sidebar moduloActivo={modulo} onCambiarModulo={cambiarModulo} />

  <div style={{ flex: 1, padding: '40px 60px', backgroundColor: '#ffffff', boxSizing: 'border-box' }}>
        {modulo === 'dashboard' ? (
          <PanelDashboard />
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
          ) : (
            <EditarPersona
              personaLegajo={legajoSeleccionado}
              onSuccess={() => setVistaPersonas('listado')}
              onCancel={() => setVistaPersonas('listado')}
            />
          )
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
          ) : null
        ) : modulo === 'elementosDeLimpieza' ? (
          vistaElementos === 'listado' ? (
            <ListadoElementosLimpieza
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
        ) : null}
      </div>
    </div>
  );
}

export default App;