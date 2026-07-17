/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0B0D12",       // app background
        panel: "#12151C",      // card/panel background
        panel2: "#181C25",     // nested panel / hover
        border: "#242938",
        muted: "#7B8394",
        text: "#E7EAF0",
        accent: "#8B7CF6",     // primary action violet
        accentDim: "#5B4FC4",
        pass: "#3FD68C",
        fail: "#F0555A",
        warn: "#E8B84B",
        info: "#4EA8DE",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
