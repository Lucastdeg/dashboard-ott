/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0B132B",
        secondary: "#F3901B",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
