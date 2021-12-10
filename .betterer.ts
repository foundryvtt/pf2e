import { eslint } from "@betterer/eslint";

export default {
    "too-much-lint": () =>
        eslint({
            "@typescript-eslint/ban-ts-comment": "error",
            "@typescript-eslint/no-explicit-any": "error",
        }).include(
            "./packs/scripts/*.ts",
            "./packs/scripts/packman/*.ts",
            "./src/**/*.ts",
            "./types/**/*.ts",
            "./webpack.config.ts"
        ),
};
