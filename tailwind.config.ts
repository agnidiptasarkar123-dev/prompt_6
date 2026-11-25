import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          midnight: "#102A2A",
          deepTeal: "#164E4A",
          saathiGreen: "#1F9D78",
          mint: "#B8E6D2",
          canvas: "#F6F8F4",
          white: "#FFFFFF",
          slate: "#526466",
          amber: "#F2B544",
          orange: "#E98245",
          red: "#D94B4B",
        },
      },
      boxShadow: {
        "card-subtle": "0 1px 3px 0 rgba(16, 42, 42, 0.05), 0 1px 2px -1px rgba(16, 42, 42, 0.05)",
        "card-hover": "0 4px 6px -1px rgba(16, 42, 42, 0.07), 0 2px 4px -2px rgba(16, 42, 42, 0.05)",
        "modal-subtle": "0 10px 25px -5px rgba(16, 42, 42, 0.12), 0 8px 10px -6px rgba(16, 42, 42, 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
