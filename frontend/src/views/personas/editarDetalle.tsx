import React, { useState, useEffect } from "react";
import type { Persona, PersonaActualizar } from "./tipos";
import '../../styles/formularioAlta.css';

export interface EditarPersonaProps {
  personaLegajo: number | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const EditarPersona: React.FC<EditarPersonaProps> = ({
  personaLegajo,
  onSuccess,
  onCancel,
}) => {
  const [formData, setFormData] = useState<PersonaActualizar>({
    nombre: "",
    apellido: "",
    documento: "",
    email: "",
    capacidad: "OPERAR",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!personaLegajo) return;

    fetch(`http://127.0.0.1:8000/personal/${personaLegajo}`, {
      headers: { "Accept": "application/json" }
    })
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo cargar la persona");
        return res.json();
      })
      .then((data: Persona) => {
        setFormData({
          nombre: data.nombre,
          apellido: data.apellido,
          documento: data.documento ?? data.dni ?? "",
          email: data.email,
          capacidad: data.capacidad || "OPERAR",
        });
      })
      .catch((err) => {
        console.error(err);
        setApiError("Error al cargar los datos de la persona.");
      })
      .finally(() => setLoading(false));
  }, [personaLegajo]);

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
        else if (!/^\d{7,8}$/.test(String(value).trim())) error = "DNI de 7 u 8 dígitos.";
        break;
      case "email":
        if (!value.trim()) error = "El correo es obligatorio.";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = "Correo inválido.";
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
    if (!personaLegajo) return;
    setApiError(null);

    validateField("nombre", formData.nombre);
    validateField("apellido", formData.apellido);
    validateField("documento", formData.documento);
    validateField("email", formData.email);

    if (
      !formData.nombre ||
      !formData.apellido ||
      !formData.documento ||
      !formData.email ||
      Object.values(errors).some((err) => err !== "")
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        nombre: formData.nombre?.trim(),
        apellido: formData.apellido?.trim(),
        documento: parseInt(String(formData.documento), 10),
        email: formData.email?.trim(),
        capacidad: formData.capacidad,
      };

      const res = await fetch(`http://127.0.0.1:8000/personal/${personaLegajo}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        let mensaje = "No se pudieron guardar los cambios.";
        if (errorData?.detail) {
          mensaje = typeof errorData.detail === "string" ? errorData.detail : "Verifica los datos ingresados.";
        }
        setApiError(mensaje);
        return;
      }

      onSuccess();
    } catch (err: any) {
      setApiError(err.message || "Error al conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="modulo-container formulario-box">
        <p>Cargando formulario de edición...</p>
      </div>
    );
  }

  return (
    <div className="modulo-container formulario-box">
      <div className="modulo-header">
        <h1>Editar Persona</h1>
        <div className="subtitulo">03 · Modificación</div>
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
            {isSubmitting ? "Guardando..." : "Guardar Cambios"}
          </button>
          <button type="button" className="btn-cancelar" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};
