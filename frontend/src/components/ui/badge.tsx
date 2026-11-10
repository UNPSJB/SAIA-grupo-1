import * as React from "react";
import "../../styles/formularioAlta.css";

export type BadgeVariant =
  | "default"
  | "secondary"
  | "outline"
  | "destructive"
  | "activo"
  | "inactivo"
  | "vencido"
  | "proximo"
  | "al_dia";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = "", variant = "default", children, ...props }, ref) => {
    let variantClass: string;

    switch (variant) {
      case "activo":
        variantClass = "badge-status activo";
        break;
      case "inactivo":
        variantClass = "badge-status inactivo";
        break;
      case "vencido":
      case "destructive":
        variantClass = "badge-vencimiento vencido";
        break;
      case "proximo":
        variantClass = "badge-vencimiento proximo";
        break;
      case "al_dia":
        variantClass = "badge-vencimiento al_dia";
        break;
      case "secondary":
        variantClass = "shadcn-badge shadcn-badge-secondary";
        break;
      case "outline":
        variantClass = "shadcn-badge shadcn-badge-outline";
        break;
      default:
        variantClass = "shadcn-badge shadcn-badge-default";
        break;
    }

    return (
      <span
        ref={ref}
        data-slot="badge"
        data-variant={variant}
        className={`${variantClass} ${className}`.trim()}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

