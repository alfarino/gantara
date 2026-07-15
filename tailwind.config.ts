import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0056C9",
          container: "#1B6EF3",
          on: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#485F82",
        },
        surface: {
          lowest: "#FFFFFF",
          variant: "#EEF1F5",
        },
        gray: {
          50: "#F8FAFB",
          100: "#EEF1F5",
          500: "#6B7B8D",
          900: "#1A2332",
        },
        success: "#10B981",
        danger: "#EF4444",
        error: "#BA1A1A",
        tertiary: {
          DEFAULT: "#9F3E00",
          container: "#C75000",
        },
        blueLight: "#E8F0FE",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        heading: ["Plus Jakarta Sans", "sans-serif"],
      },
      spacing: {
        sidebar: "260px",
        topbar: "64px",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        card: "0 2px 8px -1px rgba(0, 0, 0, 0.08), 0 1px 3px 0 rgba(0, 0, 0, 0.04)",
      },
      borderRadius: {
        card: "14px",
        btn: "10px",
      }
    },
  },
  plugins: [],
};
export default config;
