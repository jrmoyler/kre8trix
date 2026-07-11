/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* C7: theme tokens are CSS-variable driven (see src/index.css for dark/light values) */
        void: 'rgb(var(--color-void) / <alpha-value>)',
        deep: 'rgb(var(--color-deep) / <alpha-value>)',
        panel: 'rgb(var(--color-panel) / <alpha-value>)',
        panel2: 'rgb(var(--color-panel2) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        acid: 'rgb(var(--color-acid) / <alpha-value>)',
        electric: 'rgb(var(--color-electric) / <alpha-value>)',
        ember: 'rgb(var(--color-ember) / <alpha-value>)',
        violet: 'rgb(var(--color-violet) / <alpha-value>)',
        positive: 'rgb(var(--color-positive) / <alpha-value>)',
        negative: 'rgb(var(--color-negative) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        gold: 'rgb(var(--color-gold) / <alpha-value>)',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'system-ui', 'sans-serif'],
        body: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      keyframes: {
        pulse: {
          "0%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(1.2)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        pulse: "pulse 2s infinite",
      },
    },
  },
  plugins: [],
}
