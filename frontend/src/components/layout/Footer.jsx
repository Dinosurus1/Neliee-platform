// src/components/layout/Footer.jsx
export default function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="font-display text-lg font-bold text-gradient">Neliee</span>
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} Neliee. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}