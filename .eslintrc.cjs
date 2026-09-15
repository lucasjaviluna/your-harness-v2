module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  plugins: ["@typescript-eslint"],
  env: { es2022: true, node: true },
  ignorePatterns: ["dist/", "node_modules/", "packages/*/dist/"],
  rules: {
    // El primer release valida parseo; la política de estilo se consolidará aparte.
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-explicit-any": "off",
  },
};
