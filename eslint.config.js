// Flat config for ESLint v9+
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

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
      parser: tsParser
    },
    plugins: {
      "@typescript-eslint": tsPlugin
    },
    rules: {
      "no-console": "off",
      "no-undef": "off"
    }
  }
];

