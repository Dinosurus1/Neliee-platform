// src/pages/public/LandingPage.jsx
import { useState, useEffect, useRef } from "react";
import PublicNavbar from "../../components/layout/PublicNavbar";
import Footer from "../../components/layout/Footer";

const WA_NUMBER = import.meta.env.VITE_WA_NUMBER ?? "573000000000";
const WA_BASE = `https://wa.me/${WA_NUMBER}?text=`;
const WA_HELLO =
  WA_BASE +
  encodeURIComponent("Hola, me interesa conocer más sobre los productos Neliee 🌿");

const products = [
  {
    id: 1,
    emoji: "🌿",
    name: "Línea Reparadora",
    subtitle: "Nutrición profunda",
    description:
      "Restaura la fibra capilar con ingredientes botánicos de alta concentración. Devuelve suavidad, brillo y vida desde la primera aplicación.",
    badge: "Más vendido",
    accent: "#7e4731",
  },
  {
    id: 2,
    emoji: "✨",
    name: "Línea Hidratante",
    subtitle: "Hidratación duradera",
    description:
      "Tecnología de liberación lenta que mantiene la humedad durante horas. Ideal para cabellos secos, opacos y con puntas abiertas.",
    badge: "Nuevo",
    accent: "#5a7a4a",
  },
  {
    id: 3,
    emoji: "🌸",
    name: "Línea Control",
    subtitle: "Antiencrespamiento",
    description:
      "Domina el frizz y define tu estilo con fórmula libre de sulfatos. Resultados visibles y duraderos en todo tipo de cabello.",
    badge: "Favorito",
    accent: "#8b5e6a",
  },
  {
    id: 4,
    emoji: "🍃",
    name: "Línea Crecimiento",
    subtitle: "Estimula y fortalece",
    description:
      "Activos naturales que estimulan el cuero cabelludo, reducen la caída y promueven un cabello más fuerte y saludable con cada lavado.",
    badge: "Bestseller",
    accent: "#4a7a6e",
  },
];

const values = [
  {
    icon: "🌱",
    title: "100% Natural",
    text: "Ingredientes botánicos, sin parabenos ni sulfatos.",
  },
  {
    icon: "💛",
    title: "Consciente",
    text: "Libre de crueldad animal. Respeto por ti y el planeta.",
  },
  {
    icon: "🔬",
    title: "Efectivo",
    text: "Resultados comprobados en todos los tipos de cabello.",
  },
  {
    icon: "🇨🇴",
    title: "Colombiano",
    text: "Marca 100% colombiana, orgullo nacional.",
  },
];

const tabs = [
  { id: "presentacion", label: "Inicio", icon: "✦" },
  { id: "productos", label: "Líneas", icon: "◈" },
  { id: "historia", label: "Nosotros", icon: "◎" },
];

/* ── pequeño hook para detectar si el elemento ya entró al viewport ── */
function useFadeIn() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

/* ── Badge de producto ── */
function Badge({ label, accent }) {
  return (
    <span
      className="absolute top-4 right-4 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg"
      style={{ backgroundColor: accent }}
    >
      {label}
    </span>
  );
}

/* ── Tarjeta de valor ── */
function ValueCard({ icon, title, text, delay = 0 }) {
  const [ref, visible] = useFadeIn();
  return (
    <div
      ref={ref}
      className="group relative bg-[#39291c]/40 border border-[#5e4c3d]/60 p-6 rounded-2xl
                 hover:border-[#c0966b]/50 hover:-translate-y-1 hover:bg-[#39291c]/70
                 transition-all duration-300 text-center overflow-hidden"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms, border-color 0.3s, background 0.3s, translate 0.3s`,
      }}
    >
      {/* glow sutil al hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
           style={{ background: "radial-gradient(circle at 50% 0%, rgba(192,150,107,0.08), transparent 70%)" }} />
      <span className="text-3xl mb-4 block">{icon}</span>
      <h3 className="text-[#f8d7b4] font-bold text-base mb-2">{title}</h3>
      <p className="text-[#a8af8b] text-sm leading-relaxed">{text}</p>
    </div>
  );
}

/* ── Tarjeta de producto ── */
function ProductCard({ p, index }) {
  const [ref, visible] = useFadeIn();
  return (
    <article
      ref={ref}
      className="group relative bg-[#2a1f16] border border-[#5e4c3d]/80 rounded-3xl overflow-hidden
                 flex flex-col hover:border-[#efaf6b]/40 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]
                 transition-all duration-400"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.5s ease ${index * 80}ms, transform 0.5s ease ${index * 80}ms, border-color 0.3s, box-shadow 0.3s`,
      }}
    >
      {/* imagen placeholder */}
      <div className="relative h-44 flex items-center justify-center overflow-hidden"
           style={{ background: `radial-gradient(circle at 60% 40%, ${p.accent}33, #39291c)` }}>
        <Badge label={p.badge} accent={p.accent} />
        <span className="text-6xl group-hover:scale-110 group-hover:rotate-[-6deg] transition-transform duration-400">
          {p.emoji}
        </span>
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <p className="text-[#c0966b] text-[10px] font-bold uppercase tracking-[0.15em]">
          {p.subtitle}
        </p>
        <h3 className="text-[#f8d7b4] text-lg font-bold mt-1.5 mb-3">{p.name}</h3>
        <p className="text-[#a8af8b] text-xs leading-relaxed flex-grow">{p.description}</p>
        <a
          href={WA_BASE + encodeURIComponent(`Hola, me interesa la ${p.name} de Neliee 🌿`)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex items-center justify-center gap-2 w-full py-3 rounded-xl
                     font-semibold text-xs text-[#f8d7b4] transition-all duration-300
                     border border-[#5e4c3d] hover:border-[#efaf6b]/50"
          style={{
            background: `linear-gradient(135deg, ${p.accent}cc, ${p.accent}88)`,
          }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Pedir por WhatsApp
        </a>
      </div>
    </article>
  );
}

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState("presentacion");
  const [prevTab, setPrevTab] = useState(null);
  const [animKey, setAnimKey] = useState(0);

  function changeTab(id) {
    if (id === activeTab) return;
    setPrevTab(activeTab);
    setActiveTab(id);
    setAnimKey((k) => k + 1);
  }

  return (
    <div className="min-h-screen bg-[#120d08] text-[#f8d7b4] selection:bg-[#7e4731] selection:text-white flex flex-col overflow-x-hidden">
      {/* ── textura de fondo ── */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 50% at 20% -10%, rgba(126,71,49,0.12), transparent),
            radial-gradient(ellipse 60% 40% at 80% 110%, rgba(192,150,107,0.08), transparent)
          `,
        }}
        aria-hidden
      />

      <PublicNavbar />

      {/* ── TABS ── */}
      <div className="sticky top-[64px] z-40 w-full bg-[#120d08]/90 backdrop-blur-md border-b border-[#5e4c3d]/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex justify-center sm:justify-start">
          <nav className="flex gap-1 bg-[#2a1f16] rounded-xl p-1 shadow-inner">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => changeTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200
                  ${activeTab === tab.id
                    ? "bg-[#7e4731] text-white shadow-md"
                    : "text-[#c0966b] hover:text-[#f8d7b4] hover:bg-[#39291c]"
                  }`}
              >
                <span className="hidden sm:inline text-xs opacity-60">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="flex-grow flex flex-col items-center justify-start pb-24">

        {/* ══════════════════════════════════════════════
            PESTAÑA 1 — PRESENTACIÓN
        ══════════════════════════════════════════════ */}
        {activeTab === "presentacion" && (
          <div
            key={`presentacion-${animKey}`}
            className="w-full max-w-6xl px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 animate-fade-up"
          >
            {/* Hero */}
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              {/* Copy */}
              <div className="space-y-7 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 border border-[#c0966b]/30 bg-[#c0966b]/08
                                text-[#efaf6b] px-4 py-1.5 rounded-full text-xs font-semibold
                                tracking-widest uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#efaf6b] animate-pulse" />
                  Cosmética Natural Colombiana
                </div>

                <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black leading-[1.08] text-[#f8d7b4] tracking-tight">
                  Belleza que{" "}
                  <span
                    className="relative inline-block"
                    style={{
                      background: "linear-gradient(120deg, #efaf6b 20%, #c0966b 60%, #7e4731)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    transforma
                  </span>
                  <br />
                  desde adentro.
                </h1>

                <p className="text-[#a8af8b] text-base sm:text-lg leading-relaxed max-w-md mx-auto lg:mx-0">
                  Formulados con ingredientes naturales que respetan tu cabello
                  y celebran la esencia y el poder de la mujer.
                </p>

                <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-3 pt-2">
                  <a
                    href={WA_HELLO}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative overflow-hidden inline-flex items-center justify-center gap-2
                               bg-[#7e4731] hover:bg-[#9a5640] text-white px-7 py-3.5 rounded-xl
                               font-semibold transition-all duration-300
                               shadow-[0_4px_20px_rgba(126,71,49,0.45)] hover:shadow-[0_6px_28px_rgba(126,71,49,0.6)]
                               hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Quiero mi kit
                  </a>
                  <a
                    href="/login"
                    className="inline-flex items-center justify-center gap-2
                               border border-[#5e4c3d] hover:border-[#c0966b]/60
                               text-[#c0966b] hover:text-[#efaf6b]
                               px-7 py-3.5 rounded-xl font-semibold
                               transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0
                               hover:bg-[#39291c]/50"
                  >
                    Iniciar sesión
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>

                {/* Social proof mini */}
                <div className="flex items-center justify-center lg:justify-start gap-3 pt-1">
                  <div className="flex -space-x-2">
                    {["🌸","🌿","✨","🍃"].map((e, i) => (
                      <div key={i}
                           className="w-8 h-8 rounded-full bg-[#39291c] border-2 border-[#120d08]
                                      flex items-center justify-center text-sm">
                        {e}
                      </div>
                    ))}
                  </div>
                  <p className="text-[#a8af8b] text-xs">
                    <span className="text-[#efaf6b] font-bold">+2 000</span> mujeres ya lo usan
                  </p>
                </div>
              </div>

              {/* Visual hero card */}
              <div className="flex justify-center lg:justify-end">
                <div className="relative w-64 sm:w-72 lg:w-80">
                  {/* Halo */}
                  <div className="absolute inset-0 rounded-[2.5rem] blur-3xl opacity-30"
                       style={{ background: "radial-gradient(circle, #7e4731, transparent 70%)" }} />

                  {/* Tarjeta principal */}
                  <div className="relative bg-gradient-to-br from-[#39291c] to-[#1e150d]
                                  rounded-[2.5rem] border border-[#5e4c3d]/60 p-10
                                  shadow-[0_24px_80px_rgba(0,0,0,0.6)]
                                  flex flex-col items-center gap-4">
                    <span className="text-8xl drop-shadow-lg"
                          style={{ animation: "float 3s ease-in-out infinite" }}>
                      🌱
                    </span>
                    <div className="text-center">
                      <h2 className="text-3xl font-black text-[#f8d7b4] tracking-tight">Neliee</h2>
                      <p className="text-[#c0966b] text-sm italic tracking-widest">cosmetics</p>
                    </div>
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-[#5e4c3d] to-transparent" />
                    <p className="text-[#a8af8b] text-xs text-center leading-relaxed">
                      Fórmulas limpias · Sin sulfatos · Cruelty free
                    </p>
                  </div>

                  {/* Chips flotantes */}
                  <div className="absolute -top-3 -left-6 bg-[#2a1f16] border border-[#5e4c3d]
                                  px-4 py-2 rounded-2xl shadow-xl rotate-[-6deg]">
                    <p className="text-[10px] font-bold text-[#efaf6b] whitespace-nowrap">Sin Parabenos 🌿</p>
                  </div>
                  <div className="absolute -bottom-3 -right-6 bg-[#2a1f16] border border-[#5e4c3d]
                                  px-4 py-2 rounded-2xl shadow-xl rotate-[5deg]">
                    <p className="text-[10px] font-bold text-[#a8af8b] whitespace-nowrap">Fórmula Limpia ✨</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Valores ── */}
            <div className="mt-20 sm:mt-28">
              <p className="text-center text-[#c0966b] text-xs uppercase tracking-[0.2em] font-semibold mb-8">
                Por qué Neliee
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {values.map((v, i) => (
                  <ValueCard key={v.title} {...v} delay={i * 80} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            PESTAÑA 2 — PRODUCTOS
        ══════════════════════════════════════════════ */}
        {activeTab === "productos" && (
          <div
            key={`productos-${animKey}`}
            className="w-full max-w-6xl px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 animate-fade-up"
          >
            <div className="text-center mb-12 sm:mb-16 space-y-4">
              <p className="text-[#c0966b] text-xs uppercase tracking-[0.2em] font-semibold">
                Colección completa
              </p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#f8d7b4] tracking-tight">
                Una línea para{" "}
                <span
                  style={{
                    background: "linear-gradient(120deg, #efaf6b, #c0966b)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  cada necesidad
                </span>
              </h2>
              <p className="text-[#a8af8b] max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
                Cosmética limpia pensada para la mujer colombiana, sin compromisos con la naturaleza.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {products.map((p, i) => (
                <ProductCard key={p.id} p={p} index={i} />
              ))}
            </div>

            {/* Banner CTA */}
            <div className="mt-12 relative overflow-hidden rounded-3xl border border-[#5e4c3d]/60
                            bg-gradient-to-r from-[#2a1f16] via-[#39291c] to-[#2a1f16]
                            p-8 sm:p-10 text-center">
              <div className="absolute inset-0 opacity-10"
                   style={{ backgroundImage: "radial-gradient(circle at 30% 50%, #7e4731, transparent 60%), radial-gradient(circle at 80% 50%, #c0966b, transparent 60%)" }} />
              <p className="text-[#c0966b] text-xs uppercase tracking-widest font-semibold mb-3">¿No sabes cuál elegir?</p>
              <h3 className="text-2xl sm:text-3xl font-black text-[#f8d7b4] mb-4">
                Cuéntanos sobre tu cabello
              </h3>
              <p className="text-[#a8af8b] text-sm max-w-md mx-auto mb-6">
                Una asesora Neliee te ayuda a encontrar la rutina perfecta para ti, sin costo.
              </p>
              <a
                href={WA_HELLO}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#7e4731] hover:bg-[#9a5640]
                           text-white px-7 py-3.5 rounded-xl font-semibold
                           transition-all duration-300 shadow-[0_4px_20px_rgba(126,71,49,0.5)]
                           hover:-translate-y-0.5"
              >
                Asesoría gratuita por WhatsApp →
              </a>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            PESTAÑA 3 — HISTORIA
        ══════════════════════════════════════════════ */}
        {activeTab === "historia" && (
          <div
            key={`historia-${animKey}`}
            className="w-full max-w-5xl px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 animate-fade-up"
          >
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Copy */}
              <div className="space-y-6 text-center lg:text-left order-2 lg:order-1">
                <p className="text-[#c0966b] text-xs uppercase tracking-[0.2em] font-semibold">
                  Quiénes somos
                </p>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#f8d7b4] tracking-tight leading-tight">
                  Nacimos del amor{" "}
                  <span
                    style={{
                      background: "linear-gradient(120deg, #efaf6b, #c0966b)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    por lo natural
                  </span>
                </h2>
                <p className="text-[#a8af8b] leading-relaxed text-base">
                  Neliee nació de la necesidad de crear productos cosméticos que realmente
                  funcionaran, sin sacrificar la salud del cabello ni el compromiso con la
                  naturaleza. Somos una marca colombiana que cree en la fuerza de lo natural.
                </p>
                <p className="text-[#a8af8b] leading-relaxed text-base">
                  Cada fórmula es desarrollada con cuidado, seleccionando los mejores
                  ingredientes botánicos para ofrecer resultados visibles. Porque cuando
                  cuidas tu cabello, cuidas quién eres.
                </p>

                <blockquote className="relative pl-6 border-l-2 border-[#7e4731] py-2 text-left mt-8">
                  <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-[#7e4731] to-transparent" />
                  <p className="text-lg sm:text-xl text-[#efaf6b] font-serif italic leading-relaxed">
                    "Creer en la mujer, en su poder y en su belleza natural."
                  </p>
                  <footer className="mt-2 text-[#a8af8b] text-xs not-italic">— Fundadoras Neliee</footer>
                </blockquote>

                <a
                  href={WA_HELLO}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2
                             bg-[#7e4731] hover:bg-[#9a5640] text-white
                             px-6 py-3 rounded-xl font-semibold transition-all duration-300
                             shadow-[0_4px_16px_rgba(126,71,49,0.4)] hover:-translate-y-0.5"
                >
                  Conocer más →
                </a>
              </div>

              {/* Visual grid */}
              <div className="order-1 lg:order-2 grid grid-cols-2 gap-4">
                <div className="col-span-2 bg-gradient-to-br from-[#39291c] to-[#2a1f16]
                                p-7 rounded-3xl border border-[#5e4c3d]/60
                                flex items-center gap-5">
                  <span className="text-5xl flex-shrink-0">🌺</span>
                  <div>
                    <h4 className="text-lg font-bold text-[#f8d7b4]">Con Propósito</h4>
                    <p className="text-[#a8af8b] text-sm mt-1 leading-relaxed">
                      Cada producto tiene una historia y una intención clara.
                    </p>
                  </div>
                </div>

                {[
                  { emoji: "🔬", title: "Calidad", sub: "Sin atajos", bg: "#7e4731", text: "white", sub2: "rgba(248,215,180,0.7)" },
                  { emoji: "🌿", title: "Puro", sub: "Desde el origen", bg: "#c0966b", text: "#1a140f", sub2: "rgba(57,41,28,0.8)" },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="p-6 rounded-3xl flex flex-col items-center text-center gap-2"
                    style={{ backgroundColor: item.bg }}
                  >
                    <span className="text-4xl">{item.emoji}</span>
                    <h4 className="font-bold text-base" style={{ color: item.text }}>{item.title}</h4>
                    <p className="text-xs" style={{ color: item.sub2 }}>{item.sub}</p>
                  </div>
                ))}

                <div className="col-span-2 flex items-center justify-center gap-6 sm:gap-8
                                bg-[#39291c]/40 border border-[#5e4c3d]/40
                                rounded-2xl p-5">
                  {[
                    { num: "4", label: "Líneas activas" },
                    { num: "100%", label: "Natural" },
                    { num: "🇨🇴", label: "Colombiana" },
                  ].map((stat, i) => (
                    <div key={i} className="text-center">
                      <p className="text-2xl font-black text-[#efaf6b]">{stat.num}</p>
                      <p className="text-[#a8af8b] text-xs mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />

      {/* ── Estilos de animación globales ── */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(3deg); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-up {
          animation: fade-up 0.45s ease forwards;
        }
      `}</style>
    </div>
  );
}
