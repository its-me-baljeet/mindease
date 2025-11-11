import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

export default defineConfig([
  ...nextVitals,
  ...nextTs,

  // ✅ Node runtime for server-side code: avoids DOM WebSocket type conflicts
  {
    files: ["app/api/**/*.ts", "lib/**/*.ts", "scripts/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: true },
      sourceType: "module",
      ecmaVersion: 2022,
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
    env: {
      node: true,
      browser: false,
    },
    plugins: { "@typescript-eslint": tseslint },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "server.js", // CommonJS custom server
  ]),
]);
