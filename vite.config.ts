import fs from "fs-extra";
import * as Vite from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
// eslint-disable-next-line import/default
import checker from "vite-plugin-checker";
import path from "path";
import Peggy from "peggy";
import packageJSON from "./package.json";
import esbuild from "esbuild";

const config = Vite.defineConfig(({ mode }): Vite.UserConfig => {
    const buildMode = mode === "production" ? "production" : "development";
    const rollGrammar = fs.readFileSync("roll-grammar.peggy", { encoding: "utf-8" });
    const outDir = "dist";

    const plugins = [checker({ typescript: true }), tsconfigPaths()];
    // Handle minification after build to allow for tree-shaking and whitespace minification
    // "Note the build.minify option does not minify whitespaces when using the 'es' format in lib mode, as it removes
    // pure annotations and breaks tree-shaking."
    if (buildMode === "production") {
        plugins.push({
            name: "minify",
            renderChunk: {
                order: "post",
                async handler(code, chunk) {
                    return chunk.fileName.endsWith(".mjs")
                        ? esbuild.transform(code, { minify: true, keepNames: true })
                        : code;
                },
            },
        });
    } else {
        // Foundry expects all esm files listed in system.json to exist: create empty vendor module when in dev mode
        plugins.push({
            name: "touch-vendor-mjs",
            apply: "build",
            writeBundle: {
                async handler() {
                    if (buildMode === "development") {
                        fs.closeSync(fs.openSync(path.resolve(path.resolve(__dirname, outDir), "vendor.mjs"), "w"));
                    }
                },
            },
        });
    }

    return {
        base: "./",
        publicDir: "static",
        define: {
            BUILD_MODE: JSON.stringify(buildMode),
            ROLL_PARSER: Peggy.generate(rollGrammar, { output: "source" }),
        },
        esbuild: { keepNames: true },
        build: {
            outDir,
            emptyOutDir: true,
            minify: buildMode === "development",
            sourcemap: buildMode === "development" ? "inline" : false,
            lib: {
                name: "main",
                entry: "src/pf2e.ts",
                formats: ["es"],
                fileName: "main",
            },
            rollupOptions: {
                output: {
                    assetFileNames: ({ name }): string => {
                        return /\.css$/.test(name ?? "") ? "styles/pf2e.css" : name ?? "what-is-this.txt";
                    },
                    chunkFileNames: "[name].mjs",
                    entryFileNames: "pf2e.mjs",
                    manualChunks: {
                        vendor: buildMode === "production" ? Object.keys(packageJSON.dependencies) : [],
                    },
                },
                watch: { buildDelay: 100 },
            },
        },
        plugins,
    };
});

// eslint-disable-next-line import/no-default-export
export default config;
