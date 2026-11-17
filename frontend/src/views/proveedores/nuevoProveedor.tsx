import React, { useState } from 'react';
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';
import type { ProveedorForm } from './tipos';

interface NuevoProveedorProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const FORM_INICIAL: ProveedorForm = {
  nombre: '',
  cuit: '',
  contacto: '',
  telefono: '',
  email: '',
  direccion: '',
};

export const NuevoProveedor: React.FC<NuevoProveedorProps> = ({ onSuccess, onCancel }) => {
  const [form, setForm] = useState<ProveedorForm>(FORM_INICIAL);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

      const res = await apiFetch('/proveedores/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        let msg = 'Error al registrar el proveedor.';
        if (typeof data.detail === 'string') {
          msg = data.detail;
        } else if (Array.isArray(data.detail)) {
          msg = data.detail.map((err: { msg?: string }) => err.msg || JSON.stringify(err)).join(', ');
        }
        throw new Error(msg);
      }

      setSuccessMsg('Proveedor creado exitosamente.');
      setForm(FORM_INICIAL);
      onSuccess?.();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al registrar el proveedor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Nuevo Proveedor</h1>
        <div className="subtitulo">02 · Formulario</div>
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
            placeholder="Ej: Molinos Río de la Plata"
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
            placeholder="Ej: 30-50012345-6"
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
            placeholder="Ej: Carlos López"
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
            placeholder="Ej: 011-4567-8901"
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
            placeholder="Ej: ventas@proveedor.com"
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
            placeholder="Ej: Av. Paseo Colón 746, CABA"
            value={form.direccion}
            onChange={handleChange}
          />
        </div>

        <div className="form-acciones">
          <button type="submit" className="btn-guardar" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
          <button type="button" className="btn-cancelar" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};
