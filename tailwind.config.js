/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#05070d",
        ink: "#08111f",
        neon: "#45f4ff",
        plasma: "#ff4fd8",
        signal: "#c8ff4d",
        ember: "#ff7a3d",
      },
      fontFamily: {
        display: ["Space Grotesk", "Inter", "ui-sans-serif", "system-ui"],
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        glow: "0 0 48px rgba(69, 244, 255, 0.28)",
        magenta: "0 0 48px rgba(255, 79, 216, 0.22)",
      },
      backgroundImage: {
        "radial-signal":
          "radial-gradient(circle at 20% 20%, rgba(69,244,255,0.22), transparent 28%), radial-gradient(circle at 78% 12%, rgba(255,79,216,0.2), transparent 26%), radial-gradient(circle at 68% 82%, rgba(200,255,77,0.13), transparent 24%)",
      },
    },
  },
  plugins: [],
};
