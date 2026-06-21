import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-fira-code)", "monospace"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
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
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // Custom brand colors
        stellar: {
          50: "hsl(180, 100%, 97%)",
          100: "hsl(178, 96%, 90%)",
          200: "hsl(176, 88%, 78%)",
          300: "hsl(174, 80%, 63%)",
          400: "hsl(172, 74%, 48%)",
          500: "hsl(170, 68%, 38%)",
          600: "hsl(168, 70%, 30%)",
          700: "hsl(166, 72%, 24%)",
          800: "hsl(164, 74%, 18%)",
          900: "hsl(162, 76%, 12%)",
        },
        violet: {
          50: "hsl(270, 100%, 98%)",
          100: "hsl(268, 96%, 94%)",
          200: "hsl(266, 88%, 86%)",
          300: "hsl(264, 82%, 76%)",
          400: "hsl(262, 76%, 64%)",
          500: "hsl(260, 72%, 54%)",
          600: "hsl(258, 70%, 46%)",
          700: "hsl(256, 72%, 38%)",
          800: "hsl(254, 74%, 30%)",
          900: "hsl(252, 76%, 22%)",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "hero-gradient":
          "linear-gradient(135deg, hsl(250,80%,8%) 0%, hsl(230,70%,12%) 50%, hsl(200,60%,10%) 100%)",
        "card-gradient":
          "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
        "stellar-gradient":
          "linear-gradient(135deg, hsl(174,80%,40%) 0%, hsl(262,72%,54%) 100%)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "glow-pulse": {
          "0%, 100%": {
            boxShadow: "0 0 20px rgba(45, 212, 191, 0.2)",
          },
          "50%": {
            boxShadow: "0 0 40px rgba(45, 212, 191, 0.4)",
          },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out",
        "slide-in": "slide-in 0.4s ease-out",
        shimmer: "shimmer 2s infinite linear",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        glow: "0 0 30px rgba(45, 212, 191, 0.15)",
        "glow-violet": "0 0 30px rgba(139, 92, 246, 0.15)",
        card: "0 4px 24px rgba(0, 0, 0, 0.3)",
        "card-hover": "0 8px 40px rgba(0, 0, 0, 0.5)",
      },
    },
  },
  plugins: [],
};

export default config;
