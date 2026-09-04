/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.5rem", screens: { "2xl": "1400px" } },
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          soft: "hsl(var(--primary-soft))",
          deep: "hsl(var(--primary-deep))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        success: { DEFAULT: "hsl(var(--success))", soft: "hsl(var(--success-soft))" },
        danger: { DEFAULT: "hsl(var(--danger))", soft: "hsl(var(--danger-soft))" },
        warning: { DEFAULT: "hsl(var(--warning))", soft: "hsl(var(--warning-soft))" },
        info: { DEFAULT: "hsl(var(--info))", soft: "hsl(var(--info-soft))" },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16, 34, 28, 0.04), 0 1px 3px rgba(16, 34, 28, 0.03)",
        card: "0 1px 2px rgba(16, 34, 28, 0.04), 0 8px 24px -12px rgba(16, 34, 28, 0.10)",
        lift: "0 2px 4px rgba(16, 34, 28, 0.05), 0 16px 40px -16px rgba(16, 34, 28, 0.18)",
        pop: "0 12px 40px -12px rgba(16, 34, 28, 0.22)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "fade-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.25s ease-out both",
        "fade-up": "fade-up 0.28s cubic-bezier(0.22,1,0.36,1) both",
        shimmer: "shimmer 1.6s infinite",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.22, 1, 0.36, 1)",
        /**
         * Para mudanças de tamanho (recolher/expandir painéis). Diferente do
         * `smooth`, que é um easeOut agressivo: acelera e desacelera nas duas
         * pontas, então a largura não "dispara" no primeiro quadro.
         */
        panel: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
