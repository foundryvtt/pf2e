import { typescript } from "@betterer/typescript";

export default {
    "stricter compilation": typescript("./tsconfig.json", {
        strict: true,
    }).include(
        "./packs/scripts/*.ts",
        "./packs/scripts/packman/*.ts",
        "./src/**/*.ts",
        "./tests/**/*.ts",
        "./webpack.config.ts"
    ),
};
