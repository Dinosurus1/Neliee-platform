// tailwind.config.js
import { fontFamily } from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",  // Activado manualmente (siempre dark en esta app)
  theme: {
    extend: {
      // Paleta de colores del sistema de diseño
      colors: {
        cyan: {
          50:  "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",  // ← Acento principal (neón)
          600: "#0891b2",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63",
          950: "#083344",
        },
        // Escala de grises con tinte frío para el tema oscuro
        gray: {
          900: "#0f1117",
          950: "#080b10",
        },
      },

      // Fuentes: display elegante + body legible
      fontFamily: {
        sans: ["'Sora'", ...fontFamily.sans],
        display: ["'Space Grotesk'", ...fontFamily.sans],
        mono: ["'JetBrains Mono'", ...fontFamily.mono],
      },

      // Glow effects para elementos con acento neón
      boxShadow: {
        "neon-sm":  "0 0 8px  theme('colors.cyan.500 / 40%')",
        "neon-md":  "0 0 20px theme('colors.cyan.500 / 30%')",
        "neon-lg":  "0 0 40px theme('colors.cyan.500 / 20%')",
        "inner-neon": "inset 0 0 20px theme('colors.cyan.500 / 10%')",
      },

      // Fondo con textura de puntos para secciones "tech"
      backgroundImage: {
        "dot-grid":
          "radial-gradient(circle, rgba(6,182,212,0.15) 1px, transparent 1px)",
        "hero-gradient":
          "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(6,182,212,0.25) 0%, transparent 60%)",
      },
      backgroundSize: {
        "dot-grid": "28px 28px",
      },

      // Animaciones personalizadas
      animation: {
        "fade-in":     "fadeIn 0.5s ease-out",
        "slide-up":    "slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-neon":  "pulseNeon 2s ease-in-out infinite",
        "glow-border": "glowBorder 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)",    opacity: "1" },
        },
        pulseNeon: {
          "0%, 100%": { boxShadow: "0 0 8px rgba(6,182,212,0.4)" },
          "50%":      { boxShadow: "0 0 24px rgba(6,182,212,0.8)" },
        },
        glowBorder: {
          "0%, 100%": { borderColor: "rgba(6,182,212,0.3)" },
          "50%":      { borderColor: "rgba(6,182,212,0.8)" },
        },
      },
    },
  },
  plugins: [],
};