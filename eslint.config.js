// @ts-check

import json from "@eslint/json";
import { defineConfig } from "eslint/config";

// TypeScript is linted by oxlint (.oxlintrc.json): ESLint only covers JSON
export default defineConfig(
    { ignores: ["dist/**/*", "packs/**/*", "static/lib/**/*"] },
    {
        files: ["**/*.json"],
        plugins: { json },
        language: "json/json",
        rules: json.configs.recommended.rules,
    },
);
