import path from "path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: false,
    coverage: {
      reporter: ["text", "json-summary"],
      include: ["src/**/*.{js,jsx,ts,tsx}"],
      exclude: ["src/test/**", "src/app/**/page.tsx", "src/app/layout.tsx"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
