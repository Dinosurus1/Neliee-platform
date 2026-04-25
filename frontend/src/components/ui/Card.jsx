// src/components/ui/Card.jsx
/**
 * Componente Card reutilizable.
 *
 * Uso básico:
 *   <Card>contenido</Card>
 *
 * Con título y acción:
 *   <Card title="Mi sección" action={<Button>Ver más</Button>}>
 *     contenido
 *   </Card>
 *
 * Como link clickeable:
 *   <Card as={Link} to="/ruta" hoverable>contenido</Card>
 */

export default function Card({
  children,
  title,
  action,
  className = "",
  hoverable = false,
  as: Tag = "div",
  ...props
}) {
  return (
    <Tag
      className={`
        card
        ${hoverable
          ? "cursor-pointer transition-all duration-200 hover:border-cyan-500/50 hover:shadow-neon-sm"
          : ""}
        ${className}
      `}
      {...props}
    >
      {(title || action) && (
        <>
          <div className="flex items-center justify-between gap-4">
            {title && (
              <h3 className="font-display text-base font-semibold text-gray-100">
                {title}
              </h3>
            )}
            {action && <div className="shrink-0">{action}</div>}
          </div>
          <div className="divider-neon my-4" />
        </>
      )}
      {children}
    </Tag>
  );
}