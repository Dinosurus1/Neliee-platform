// src/pages/public/LandingPage.jsx
import { Link } from "react-router-dom";
import PublicNavbar from "../../components/layout/PublicNavbar";
import Footer from "../../components/layout/Footer";

const WA_NUMBER  = import.meta.env.VITE_WA_NUMBER  ?? "573000000000";
const WA_MSG     = import.meta.env.VITE_WA_DEFAULT_MSG ?? "Hola,%20quiero%20información";
const WA_URL     = `https://wa.me/${WA_NUMBER}?text=${WA_MSG}`;

// ── Datos de ejemplo — reemplaza con los tuyos ────────────────────────────
const products = [
  {
    id: 1,
    name: "Servicio Premium",
    description: "Solución completa adaptada a las necesidades de tu empresa.",
    tag: "Más popular",
  },
  {
    id: 2,
    name: "Consultoría",
    description: "Asesoría personalizada para optimizar tus procesos internos.",
    tag: "Flexible",
  },
  {
    id: 3,
    name: "Capacitación",
    description: "Formación especializada para tu equipo de trabajo.",
    tag: "Equipo",
  },
];

const stats = [
  { value: "5+", label: "Años de experiencia" },
  { value: "200+", label: "Clientes satisfechos" },
  { value: "30", label: "Profesionales" },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="bg-[var(--color-bg-primary)]">
      <PublicNavbar />

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section
        id="hero"
        className="relative flex min-h-screen flex-col items-center justify-center
                   px-6 pt-24 text-center section-dots"
      >
        {/* Gradiente radial de fondo */}
        <div className="pointer-events-none absolute inset-0 bg-hero-gradient" />

        <div className="relative max-w-3xl animate-slide-up">
          <span className="mb-4 inline-block rounded-full border border-cyan-500/30
                           bg-cyan-500/5 px-4 py-1.5 text-xs font-medium text-cyan-400">
            Tecnología · Innovación · Crecimiento
          </span>

          <h1 className="font-display text-5xl font-bold leading-tight text-gray-100 md:text-6xl">
            Impulsa tu empresa con{" "}
            <span className="text-gradient">soluciones reales</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg text-gray-400">
            Ofrecemos servicios especializados para llevar tu negocio al siguiente nivel.
            Contáctanos y hagamos crecer tu empresa juntos.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="btn-primary">
              💬 Hablar con nosotros
            </a>
            <a href="#servicios" className="btn-outline">
              Ver servicios →
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="relative mt-24 grid grid-cols-3 gap-8 divide-x divide-[var(--color-border)]">
          {stats.map((s) => (
            <div key={s.label} className="px-8 text-center">
              <p className="font-display text-3xl font-bold text-gradient">{s.value}</p>
              <p className="mt-1 text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── QUIÉNES SOMOS ───────────────────────────────────────────────── */}
      <section
        id="nosotros"
        className="bg-[var(--color-bg-secondary)] px-6 py-24"
      >
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            {/* Texto */}
            <div className="animate-fade-in">
              <span className="text-xs font-semibold uppercase tracking-widest text-cyan-500">
                Sobre nosotros
              </span>
              <h2 className="mt-3 font-display text-4xl font-bold text-gray-100">
                ¿Quiénes somos?
              </h2>
              <div className="divider-neon my-5 w-16" />
              <p className="text-gray-400 leading-relaxed">
                Somos un equipo apasionado por la tecnología y la excelencia empresarial.
                Con años de experiencia en el sector, ayudamos a organizaciones a alcanzar
                sus metas a través de soluciones innovadoras y un servicio de calidad.
              </p>
              <p className="mt-4 text-gray-400 leading-relaxed">
                Nuestra misión es clara: acompañar a nuestros clientes en cada paso,
                desde la estrategia hasta la ejecución, con un equipo comprometido
                y herramientas de última generación.
              </p>
            </div>

            {/* Visual decorativo */}
            <div className="flex items-center justify-center">
              <div className="card h-64 w-full max-w-sm section-dots shadow-neon-lg flex items-center justify-center">
                <span className="text-6xl">🚀</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICIOS / CATÁLOGO ─────────────────────────────────────────── */}
      <section id="servicios" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-500">
              Lo que ofrecemos
            </span>
            <h2 className="mt-3 font-display text-4xl font-bold text-gray-100">
              Nuestros servicios
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-gray-500">
              Cada servicio está diseñado para generar resultados concretos y medibles
              para tu empresa.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <article
                key={p.id}
                className="card group flex flex-col gap-4 transition-all duration-200
                           hover:border-cyan-500/50 hover:shadow-neon-sm animate-glow-border"
              >
                <span className="inline-block rounded-full bg-cyan-500/10 px-3 py-1
                                 text-xs font-medium text-cyan-400 w-fit">
                  {p.tag}
                </span>

                <h3 className="font-display text-xl font-semibold text-gray-100
                               group-hover:text-cyan-300 transition-colors">
                  {p.name}
                </h3>

                <p className="flex-1 text-sm text-gray-500 leading-relaxed">
                  {p.description}
                </p>

                <a
                  href={`${WA_URL}&text=Hola,%20me%20interesa%20el%20servicio%20de%20${encodeURIComponent(p.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary w-full justify-center"
                >
                  💬 Comprar por WhatsApp
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────────────── */}
      <section className="border-y border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-gray-100">
            ¿Listo para dar el siguiente paso?
          </h2>
          <p className="mt-4 text-gray-500">
            Contáctanos hoy y te responderemos a la brevedad.
          </p>
          <a
            href={WA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary mt-8 inline-flex shadow-neon-md"
          >
            💬 Escribir por WhatsApp
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}