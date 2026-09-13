import { svelte as sveltePlugin, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [sveltePlugin({ preprocess: vitePreprocess() })],
    define: {
        SYSTEM_ID: JSON.stringify("pf2e"),
        SYSTEM_NAME: JSON.stringify("PF2e"),
        BUILD_MODE: JSON.stringify("development"),
    },
    resolve: {
        tsconfigPaths: true,
        alias: { tests: import.meta.dirname + "/tests" },
        // Without this, svelte resolves to its server build, and mounting a component in a DOM test
        // throws lifecycle_function_unavailable.
        conditions: ["browser"],
    },
    ssr: { resolve: { conditions: ["browser"] } },
    test: {
        globals: true,
        setupFiles: ["./tests/setup.ts"],
        include: ["tests/**/*.test.ts"],
        // A DOM-dependent test can opt out per file with a `// @vitest-environment` docblock
        environment: "node",
    },
});
