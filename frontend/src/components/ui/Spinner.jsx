// src/components/ui/Spinner.jsx
const sizes = { sm: "h-5 w-5", md: "h-8 w-8", lg: "h-12 w-12" };

export default function Spinner({ size = "md" }) {
  return (
    <div
      className={`${sizes[size]} animate-spin rounded-full
                  border-4 border-gray-800 border-t-cyan-400`}
      role="status"
      aria-label="Cargando"
    />
  );
}