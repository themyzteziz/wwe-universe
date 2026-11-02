import { defineConfig, globalIgnores } from "eslint/config";

const browserAndNode = {
  window: "readonly",
  document: "readonly",
  localStorage: "readonly",
  crypto: "readonly",
  console: "readonly",
  alert: "readonly",
  URL: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
};

export default defineConfig([
  globalIgnores(["dist/**", "node_modules/**"]),
  {
    files: ["**/*.{js,jsx,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: browserAndNode,
    },
    rules: {
      "no-undef": "error",
      // Capitalised names are React components used in JSX, which core ESLint cannot see.
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z]" }],
    },
  },
]);
