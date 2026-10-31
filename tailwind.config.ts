import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/frontend/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          DEFAULT: "var(--accent)",
          soft: "var(--accent-soft)",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui"],
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "meter-fill": {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "0.9" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.45s ease-out both",
        "meter-fill": "meter-fill 0.7s ease-out both",
        "pulse-soft": "pulse-soft 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
