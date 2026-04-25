// src/components/layout/PublicNavbar.jsx
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

const navLinks = [
  { label: "Inicio", href: "#hero" },
  { label: "Quiénes Somos", href: "#nosotros" },
  { label: "Servicios", href: "#servicios" },
];

export default function PublicNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 z-40 w-full border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link to="/" className="font-display text-xl font-bold text-gradient">
          Neliee
        </Link>

        {/* Desktop links */}
        <ul className="hidden items-center gap-8 md:flex">
          {navLinks.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-sm text-gray-400 transition-colors hover:text-cyan-400"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="hidden items-center gap-3 md:flex">
          <Link to="/login" className="btn-outline py-2 px-4 text-xs">
            Acceso Empleadas →
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-gray-400 hover:text-cyan-400"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menú"
        >
          <span className="text-2xl">{menuOpen ? "✕" : "☰"}</span>
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-6 py-4 md:hidden">
          <ul className="flex flex-col gap-4">
            {navLinks.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="text-sm text-gray-400 hover:text-cyan-400"
                  onClick={() => setMenuOpen(false)}
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <Link to="/login" className="btn-outline w-full justify-center text-xs py-2">
                Acceso Empleadas →
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}