import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/wwe-universe/",
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./vitest.setup.js",
    testTimeout: 20000,
    include: ["**/*.test.{js,jsx}"],
    exclude: [
      "node_modules/**",
      "dist/**",
      "src/**",
      "test/*.ts",
      "test/**/*.ts",
    ],
  },
});
