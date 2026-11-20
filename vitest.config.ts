import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  root: import.meta.dirname,
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    css: false,
    coverage: {
      provider: "custom",
      customProviderModule: path.resolve(import.meta.dirname, "./node_modules/@vitest/coverage-v8"),
      reporter: ["text", "json", "html"],
      include: ["src/domain/**/*.ts", "src/schemas/**/*.ts"],
      exclude: ["src/types/**", "node_modules/**"],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src")
    }
  }
});
