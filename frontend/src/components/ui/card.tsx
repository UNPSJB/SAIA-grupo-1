import * as React from "react";

export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = "", style, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card"
    className={`shadcn-card ${className}`.trim()}
    style={{
      backgroundColor: "var(--color-superficie)",
      border: "1px solid var(--color-borde)",
      borderRadius: "12px",
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
      color: "var(--color-texto)",
      ...style,
    }}
    {...props}
  />
));
Card.displayName = "Card";

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = "", style, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-header"
    className={`shadcn-card-header ${className}`.trim()}
    style={{
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      padding: "16px 20px",
      borderBottom: "1px solid var(--color-borde)",
      ...style,
    }}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className = "", style, ...props }, ref) => (
  <h3
    ref={ref}
    data-slot="card-title"
    className={`shadcn-card-title ${className}`.trim()}
    style={{
      fontSize: "1.05rem",
      fontWeight: 600,
      margin: 0,
      color: "var(--text-h)",
      letterSpacing: "-0.01em",
      ...style,
    }}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className = "", style, ...props }, ref) => (
  <p
    ref={ref}
    data-slot="card-description"
    className={`shadcn-card-description ${className}`.trim()}
    style={{
      fontSize: "0.85rem",
      color: "var(--color-texto-sec)",
      margin: 0,
      lineHeight: 1.4,
      ...style,
    }}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = "", style, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-content"
    className={`shadcn-card-content ${className}`.trim()}
    style={{
      padding: "20px",
      ...style,
    }}
    {...props}
  />
));
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = "", style, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-footer"
    className={`shadcn-card-footer ${className}`.trim()}
    style={{
      display: "flex",
      alignItems: "center",
      padding: "12px 20px",
      borderTop: "1px solid var(--color-borde)",
      ...style,
    }}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";
