import React, { useEffect, useState } from 'react';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';
import type { Proveedor, ProveedorForm } from './tipos';

interface EditarProveedorProps {
  id: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const EditarProveedor: React.FC<EditarProveedorProps> = ({ id, onSuccess, onCancel }) => {
  const [form, setForm] = useState<ProveedorForm>({
    nombre: '',
    cuit: '',
    contacto: '',
    telefono: '',
    email: '',
    direccion: '',
  });
  const [loading, setLoading] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      try {
        const res = await apiFetch(`/proveedores/${id}`);
        if (!cancelado && res.ok) {
          const data: Proveedor = await res.json();
          setForm({
            nombre: data.nombre,
            cuit: data.cuit || '',
            contacto: data.contacto || '',
            telefono: data.telefono || '',
            email: data.email || '',
            direccion: data.direccion || '',
          });
        } else if (!cancelado) {
          setErrorMsg('No se pudo cargar la información del proveedor.');
        }
      } catch {
        if (!cancelado) setErrorMsg('Error de conexión al cargar el proveedor.');
      } finally {
        if (!cancelado) setCargandoDatos(false);
      }
    }
    cargar();
    return () => {
      cancelado = true;
    };
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const nombreLimpio = form.nombre.trim();
    if (!nombreLimpio) {
      setErrorMsg('El nombre del proveedor no puede estar vacío.');
      return;
    }
    if (nombreLimpio.length < 2) {
      setErrorMsg('El nombre debe tener al menos 2 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        nombre: nombreLimpio,
        cuit: form.cuit.trim() || null,
        contacto: form.contacto.trim() || null,
        telefono: form.telefono.trim() || null,
        email: form.email.trim() || null,
        direccion: form.direccion.trim() || null,
      };

      const res = await apiFetch(`/proveedores/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        let msg = 'Error al actualizar el proveedor.';
        if (typeof data.detail === 'string') {
          msg = data.detail;
        } else if (Array.isArray(data.detail)) {
          msg = data.detail.map((err: { msg?: string }) => err.msg || JSON.stringify(err)).join(', ');
        }
        throw new Error(msg);
      }

      setSuccessMsg('Proveedor actualizado exitosamente.');
      onSuccess?.();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al actualizar el proveedor.');
    } finally {
      setLoading(false);
    }
  }

  if (cargandoDatos) {
    return (
      <div className="modulo-container formulario-box">
        <p style={{ textAlign: 'center', padding: '2rem' }}>Cargando datos del proveedor...</p>
      </div>
    );
  }

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Editar Proveedor</h1>
        <div className="subtitulo">03 · Edición</div>
      </div>

      {errorMsg && <div className="alerta-error">{errorMsg}</div>}
      {successMsg && <div className="alerta-exito">{successMsg}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nombre">Razón Social / Nombre *</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            value={form.nombre}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="cuit">CUIT</label>
          <input
            id="cuit"
            name="cuit"
            type="text"
            value={form.cuit}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="contacto">Persona de Contacto</label>
          <input
            id="contacto"
            name="contacto"
            type="text"
            value={form.contacto}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="telefono">Teléfono</label>
          <input
            id="telefono"
            name="telefono"
            type="text"
            value={form.telefono}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="direccion">Dirección</label>
          <input
            id="direccion"
            name="direccion"
            type="text"
            value={form.direccion}
            onChange={handleChange}
          />
        </div>

        <div className="form-acciones">
          <button type="submit" className="btn-guardar" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          <button type="button" className="btn-cancelar" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};
