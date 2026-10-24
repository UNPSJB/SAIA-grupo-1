import * as React from "react";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", style, ...props }, ref) => (
    <div
      ref={ref}
      className={`shadcn-card ${className}`.trim()}
      style={{
        borderRadius: '12px',
        border: '1px solid var(--color-borde)',
        backgroundColor: 'var(--color-superficie)',
        color: 'var(--color-texto)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden',
        boxSizing: 'border-box',
        ...style,
      }}
      {...props}
    />
  )
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", style, ...props }, ref) => (
    <div
      ref={ref}
      className={`shadcn-card-header ${className}`.trim()}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '20px 24px 16px',
        boxSizing: 'border-box',
        ...style,
      }}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className = "", style, ...props }, ref) => (
    <h3
      ref={ref}
      className={`shadcn-card-title ${className}`.trim()}
      style={{
        fontSize: '1.15rem',
        fontWeight: 600,
        lineHeight: 1.25,
        letterSpacing: '-0.015em',
        color: 'var(--text-h)',
        margin: 0,
        boxSizing: 'border-box',
        ...style,
      }}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className = "", style, ...props }, ref) => (
    <p
      ref={ref}
      className={`shadcn-card-description ${className}`.trim()}
      style={{
        fontSize: '0.875rem',
        color: 'var(--color-texto-sec)',
        margin: 0,
        boxSizing: 'border-box',
        ...style,
      }}
      {...props}
    />
  )
);
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", style, ...props }, ref) => (
    <div
      ref={ref}
      className={`shadcn-card-content ${className}`.trim()}
      style={{
        padding: '0 24px 20px',
        boxSizing: 'border-box',
        ...style,
      }}
      {...props}
    />
  )
);
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", style, ...props }, ref) => (
    <div
      ref={ref}
      className={`shadcn-card-footer ${className}`.trim()}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 24px 20px',
        boxSizing: 'border-box',
        ...style,
      }}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";
