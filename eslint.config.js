// Flat config for ESLint v9+
export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "**/*.md",
      "**/*.json",
      "**/*.lock",
      "**/*.yml",
      "**/*.yaml"
    ]
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        module: "readonly",
        require: "readonly"
      },
      parser: await import("@typescript-eslint/parser").then(m => m.default)
    },
    plugins: {
      "@typescript-eslint": await import("@typescript-eslint/eslint-plugin").then(m => m.default || m)
    },
    rules: {
      "no-console": "off",
      "no-undef": "off"
    }
  }
];

