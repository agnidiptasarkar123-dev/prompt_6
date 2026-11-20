import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  root: __dirname,
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/domain/**/*.ts", "src/schemas/**/*.ts"],
      exclude: ["src/types/**", "node_modules/**"]
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});
