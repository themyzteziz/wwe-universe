import js from "@eslint/js";

const browser = Object.fromEntries(
  [
    "window", "document", "localStorage", "console", "navigator", "URL", "Blob",
    "FileReader", "setTimeout", "clearTimeout", "alert", "confirm", "crypto",
  ].map((name) => [name, "readonly"]),
);

export default [
  { ignores: ["dist/**", "node_modules/**", "build/**", "src/**", "test/**", "public/**"] },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: browser,
    },
    rules: {
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]", argsIgnorePattern: "^_" }],
    },
  },
];
