import React, { useState } from "react";
import type { PersonaCrear } from "./tipos";

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
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

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
        nombre: formData.nombre.trim(),
        apellido: formData.apellido.trim(),
        documento: parseInt(String(formData.documento), 10),
        email: formData.email.trim(),
        activo: true,
        capacidad: formData.capacidad,
      };

      const res = await fetch("http://127.0.0.1:8000/personal/", {
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

      onSuccess();
    } catch (err: any) {
      setApiError(err.message || "Error de conexión con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "15px",
    fontWeight: "700",
    color: "#e5e7eb",
    marginBottom: "8px",
  };

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: "100%",
    padding: "14px 16px",
    backgroundColor: "#1c1c26",
    border: hasError ? "1px solid #ef4444" : "1px solid #2d2d3a",
    borderRadius: "8px",
    fontSize: "15px",
    color: "#ffffff",
    boxSizing: "border-box",
    outline: "none",
  });

  return (
    <div style={{ padding: "40px 60px", backgroundColor: "#13131a", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ marginBottom: "35px" }}>
        <h1 style={{ fontSize: "36px", fontWeight: "bold", margin: "0 0 6px 0", color: "#ffffff", letterSpacing: "-0.5px" }}>
          Nueva Persona
        </h1>
        <span style={{ fontSize: "15px", color: "#9ca3af" }}>
          02 · Formulario
        </span>
      </div>

      {apiError && (
        <div style={{ maxWidth: "540px", backgroundColor: "#3f1417", border: "1px solid #f87171", color: "#fca5a5", padding: "14px 18px", borderRadius: "8px", marginBottom: "24px", fontSize: "14px" }}>
          ⚠️ {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ maxWidth: "540px", display: "flex", flexDirection: "column", gap: "22px" }}>
        <div>
          <label style={labelStyle}>Nombre</label>
          <input
            type="text"
            name="nombre"
            placeholder="Introduce el nombre"
            value={formData.nombre}
            onChange={handleChange}
            style={inputStyle(!!errors.nombre)}
          />
          {errors.nombre && <span style={{ color: "#ef4444", fontSize: "13px", marginTop: "4px", display: "block" }}>{errors.nombre}</span>}
        </div>

        <div>
          <label style={labelStyle}>Apellido</label>
          <input
            type="text"
            name="apellido"
            placeholder="Introduce el apellido"
            value={formData.apellido}
            onChange={handleChange}
            style={inputStyle(!!errors.apellido)}
          />
          {errors.apellido && <span style={{ color: "#ef4444", fontSize: "13px", marginTop: "4px", display: "block" }}>{errors.apellido}</span>}
        </div>

        <div>
          <label style={labelStyle}>DNI</label>
          <input
            type="text"
            name="documento"
            placeholder="Introduce el DNI"
            value={formData.documento}
            onChange={handleChange}
            style={inputStyle(!!errors.documento)}
          />
          {errors.documento && <span style={{ color: "#ef4444", fontSize: "13px", marginTop: "4px", display: "block" }}>{errors.documento}</span>}
        </div>

        <div>
          <label style={labelStyle}>Correo electrónico</label>
          <input
            type="email"
            name="email"
            placeholder="Introduce el correo electrónico"
            value={formData.email}
            onChange={handleChange}
            style={inputStyle(!!errors.email)}
          />
          {errors.email && <span style={{ color: "#ef4444", fontSize: "13px", marginTop: "4px", display: "block" }}>{errors.email}</span>}
        </div>

        <div>
          <label style={labelStyle}>Capacidad</label>
          <select
            name="capacidad"
            value={formData.capacidad}
            onChange={handleChange}
            style={{ ...inputStyle(false), cursor: "pointer" }}
          >
            <option value="OPERAR">OPERAR</option>
            <option value="MANTENIMIENTO">MANTENIMIENTO</option>
            <option value="AMBAS">AMBAS</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            style={{
              padding: "12px 24px",
              backgroundColor: "#252533",
              color: "#d1d5db",
              border: "none",
              borderRadius: "8px",
              fontWeight: "600",
              fontSize: "15px",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: "12px 28px",
              backgroundColor: "#ffffff",
              color: "#000000",
              border: "none",
              borderRadius: "8px",
              fontWeight: "600",
              fontSize: "15px",
              cursor: "pointer",
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
};

export { NuevaPersona as NuevoPersona };