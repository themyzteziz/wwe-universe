import js from "@eslint/js";

export default [
  { ignores: ["dist/**", "node_modules/**", "public/**"] },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Browser and test globals are not declared; the build and tests catch undefined names.
      "no-undef": "off",
      // Without a React plugin, JSX usage is not seen: ignore capitalised names (components, React).
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z]" }],
    },
  },
];
