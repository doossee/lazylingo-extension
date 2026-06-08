/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        card: "var(--color-card)",
        muted: "var(--color-muted)",
        "muted-foreground": "var(--color-muted-foreground)",
        secondary: "var(--color-secondary)",
        "secondary-foreground": "var(--color-secondary-foreground)",
        border: "var(--color-border)",
        input: "var(--color-input)",
        ring: "var(--color-ring)",
        primary: "var(--color-primary)",
        "primary-foreground": "var(--color-primary-foreground)",
        destructive: "var(--color-destructive)",
        success: "var(--color-success)",
      },
      fontFamily: {
        serif: ["Georgia", '"Times New Roman"', "serif"],
      },
    },
  },
  plugins: [],
};
