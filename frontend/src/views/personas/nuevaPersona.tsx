import React, { useState } from "react";
import type { Persona, PersonaCrear } from "./tipos";
import '../../styles/formularioAlta.css';
import { apiFetch } from '../../api/client';

export interface NuevoPersonaProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const NuevaPersona: React.FC<NuevoPersonaProps> = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState<PersonaCrear>({
    nombre: "",
    apellido: "",
    documento: "",
    email: "",
    activo: true,
    capacidad: "OPERAR",
    contrasenia: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [personaCreada, setPersonaCreada] = useState<Persona | null>(null);

  const validateField = (name: string, value: any) => {
    let error = "";
    switch (name) {
      case "nombre":
        if (!value.trim()) error = "El nombre es obligatorio.";
        else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(value)) error = "Solo letras y espacios.";
        break;
      case "apellido":
        if (!value.trim()) error = "El apellido es obligatorio.";
        else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(value)) error = "Solo letras y espacios.";
        break;
      case "documento":
        if (!String(value).trim()) error = "El DNI es obligatorio.";
        else if (!/^\d{7,8}$/.test(String(value).trim())) error = "DNI de 7 u 8 dígitos numéricos.";
        break;
      case "email":
        if (!value.trim()) error = "El correo electrónico es obligatorio.";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = "Correo electrónico inválido.";
        break;
      case "contrasenia":
        if (!value) error = "La contraseña es obligatoria.";
        else if (value.length < 8) error = "Mínimo 8 caracteres.";
        else if (value.length > 72) error = "Máximo 72 caracteres.";
        break;
      default:
        break;
    }
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setApiError(null);
    validateField(name, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    validateField("nombre", formData.nombre);
    validateField("apellido", formData.apellido);
    validateField("documento", formData.documento);
    validateField("email", formData.email);
    validateField("contrasenia", formData.contrasenia);

    if (
      !formData.nombre ||
      !formData.apellido ||
      !formData.documento ||
      !formData.email ||
      formData.contrasenia.length < 8 ||
      formData.contrasenia.length > 72 ||
      Object.values(errors).some((err) => err !== "")
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        nombre: formData.nombre.trim(),
        apellido: formData.apellido.trim(),
        documento: parseInt(String(formData.documento), 10),
        email: formData.email.trim(),
        activo: true,
        capacidad: formData.capacidad,
        contrasenia: formData.contrasenia,
      };

      const res = await apiFetch("/personal/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        let mensaje = "Error al registrar la persona.";

        if (errorData?.detail) {
          if (typeof errorData.detail === "string") {
            mensaje = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            mensaje = errorData.detail.map((d: any) => d.msg).join(". ");
          }
        }
        setApiError(mensaje);
        return;
      }

      // el usuario lo genera el servidor: se lo mostramos al administrador para que se lo comunique
      setPersonaCreada(await res.json());
    } catch (err: any) {
      setApiError(err.message || "Error de conexión con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (personaCreada) {
    return (
      <div className="modulo-container formulario-box">
        <div className="modulo-header">
          <h1>Persona registrada</h1>
          <div className="subtitulo">02 · Formulario</div>
        </div>

        <p style={{ marginBottom: "16px" }}>
          {personaCreada.nombre} {personaCreada.apellido} ya puede iniciar sesión. Comunicale el usuario
          asignado y la contraseña que definiste.
        </p>

        <div className="form-group">
          <label htmlFor="usuario-asignado">Usuario asignado</label>
          <input id="usuario-asignado" value={personaCreada.usuario} readOnly />
        </div>

        <div className="form-acciones">
          <button type="button" className="btn-guardar" onClick={onSuccess}>
            Aceptar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Nueva Persona</h1>
        <div className="subtitulo">02 · Formulario</div>
      </div>

      {apiError && <div className="alerta-error">{apiError}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nombre">Nombre</label>
          <input
            id="nombre"
            type="text"
            name="nombre"
            placeholder="Introduce el nombre"
            value={formData.nombre}
            onChange={handleChange}
          />
          {errors.nombre && <span className="campo-error">{errors.nombre}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="apellido">Apellido</label>
          <input
            id="apellido"
            type="text"
            name="apellido"
            placeholder="Introduce el apellido"
            value={formData.apellido}
            onChange={handleChange}
          />
          {errors.apellido && <span className="campo-error">{errors.apellido}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="documento">DNI</label>
          <input
            id="documento"
            type="text"
            name="documento"
            placeholder="Introduce el DNI"
            value={formData.documento}
            onChange={handleChange}
          />
          {errors.documento && <span className="campo-error">{errors.documento}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            type="email"
            name="email"
            placeholder="Introduce el correo electrónico"
            value={formData.email}
            onChange={handleChange}
          />
          {errors.email && <span className="campo-error">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="contrasenia">Contraseña</label>
          <input
            id="contrasenia"
            type="password"
            name="contrasenia"
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            value={formData.contrasenia}
            onChange={handleChange}
          />
          {errors.contrasenia && <span className="campo-error">{errors.contrasenia}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="capacidad">Capacidad</label>
          <select
            id="capacidad"
            name="capacidad"
            value={formData.capacidad}
            onChange={handleChange}
          >
            <option value="OPERAR">Operar</option>
            <option value="ADMINISTRAR">Administrar</option>
            <option value="AMBAS">Operar y Administrar</option>
          </select>
        </div>

        <div className="form-acciones">
          <button type="submit" className="btn-guardar" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar"}
          </button>
          <button type="button" className="btn-cancelar" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export { NuevaPersona as NuevoPersona };
