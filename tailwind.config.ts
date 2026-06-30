import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          DEFAULT: "var(--brand)",
          hover: "var(--brand-hover)",
          foreground: "var(--brand-foreground)",
          subtle: "var(--brand-subtle)",
          "subtle-fg": "var(--brand-subtle-fg)",
          muted: "var(--brand-muted)",
          border: "var(--brand-border)",
        },
        accent: {
          morning: {
            DEFAULT: "var(--accent-morning)",
            subtle: "var(--accent-morning-subtle)",
            fg: "var(--accent-morning-fg)",
          },
          evening: {
            DEFAULT: "var(--accent-evening)",
            subtle: "var(--accent-evening-subtle)",
            fg: "var(--accent-evening-fg)",
          },
          priority: {
            DEFAULT: "var(--accent-priority)",
            subtle: "var(--accent-priority-subtle)",
            fg: "var(--accent-priority-fg)",
          },
        },
      },
    },
  },
  plugins: [],
};
export default config;
