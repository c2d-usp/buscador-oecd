import typography from '@tailwindcss/typography'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#F3F6FB",
        surface: "#FFFFFF",
        surfaceAlt: "#F8FAFD",
        border: "#D9E2EC",
        textMain: "#0F172A",
        muted: "#64748B",
        accent: "#EC7000",
        accentHover: "#D96200",
        accentSoft: "#FFF1E6",
        primary: "#1E3A8A",
        primarySoft: "#EAF1FF",
      }
    },
  },
  plugins: [typography],
}
