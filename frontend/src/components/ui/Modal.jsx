// src/components/ui/Modal.jsx
import { useEffect } from "react";

export default function Modal({ isOpen, onClose, title, children }) {
  // Cerrar con Escape
  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md animate-slide-up shadow-neon-md overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
        <div className="px-6 py-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-gray-100">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-800 hover:text-gray-200 transition-colors"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
          <div className="divider-neon my-4" />
          {children}
        </div>
      </div>
    </div>
  );
}