// src/components/layout/PublicNavbar.jsx
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

export default function PublicNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="fixed top-0 z-50 w-full transition-all duration-300"
      style={{
        background: scrolled ? "rgba(18, 13, 8, 0.92)" : "rgba(18, 13, 8, 0.75)",
        backdropFilter: "blur(14px)",
        borderBottom: scrolled
          ? "1px solid rgba(94, 76, 61, 0.5)"
          : "1px solid rgba(94, 76, 61, 0.2)",
        boxShadow: scrolled ? "0 4px 24px rgba(0,0,0,0.4)" : "none",
      }}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 sm:px-6 h-16">

        {/* ── Logo ── */}
        <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center text-base
                       transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-6deg]"
            style={{ background: "linear-gradient(135deg, #7e4731, #c0966b)" }}
          >
            🌿
          </span>
          <span
            className="text-lg font-black tracking-tight"
            style={{
              background: "linear-gradient(120deg, #f8d7b4 30%, #c0966b)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Neliee
          </span>
          <span className="hidden sm:block text-[10px] text-[#c0966b]/70 italic tracking-widest -ml-1 mt-0.5">
            cosmetics
          </span>
        </Link>

        {/* ── Botones siempre visibles ── */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <Link
            to="/login"
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-[#c0966b]
                       border border-[#5e4c3d] hover:border-[#c0966b]/60 rounded-lg
                       hover:bg-[#39291c]/50 hover:text-[#f8d7b4] transition-all duration-200
                       whitespace-nowrap"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/register"
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white rounded-lg
                       transition-all duration-200 hover:-translate-y-px whitespace-nowrap
                       hover:shadow-[0_4px_16px_rgba(126,71,49,0.5)]"
            style={{ background: "linear-gradient(135deg, #7e4731, #9a5640)" }}
          >
            Registrarse
          </Link>
        </div>

      </nav>
    </header>
  );
}