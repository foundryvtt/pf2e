import fs from "fs-extra";
import * as Vite from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
// eslint-disable-next-line import/default
import checker from "vite-plugin-checker";
import path from "path";
import Peggy from "peggy";
import packageJSON from "./package.json";
import esbuild from "esbuild";

const config = Vite.defineConfig(({ command, mode }): Vite.UserConfig => {
    const buildMode = mode === "production" ? "production" : "development";
    const rollGrammar = fs.readFileSync("roll-grammar.peggy", { encoding: "utf-8" });
    const outDir = ((): string => {
        const configPath = path.resolve(process.cwd(), "foundryconfig.json");
        const config: unknown = fs.readJSONSync(configPath, { throws: false });
        return config instanceof Object && "dataPath" in config && typeof config.dataPath === "string"
            ? path.join(config.dataPath, "Data", "systems", "pf2e")
            : path.resolve(__dirname, "dist");
    })();

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
        plugins.push(
            // Foundry expects all esm files listed in system.json to exist: create empty vendor module when in dev mode
            {
                name: "touch-vendor-mjs",
                apply: "build",
                writeBundle: {
                    async handler() {
                        if (buildMode === "development") {
                            fs.closeSync(fs.openSync(path.resolve(outDir, "vendor.mjs"), "w"));
                        }
                    },
                },
            },
            // Vite HMR is only preconfigured for css files: add handler for HBS templates
            {
                name: "hmr-handler",
                apply: "serve",
                handleHotUpdate(context) {
                    if (context.file.endsWith(".hbs") && !context.file.startsWith(outDir)) {
                        const basePath = context.file.slice(context.file.indexOf("templates/"));
                        console.log(`Updating template at ${basePath}`);
                        fs.promises.copyFile(context.file, `${outDir}/${basePath}`).then(() => {
                            context.server.ws.send({
                                type: "custom",
                                event: "template-update",
                                data: { path: `systems/pf2e/${basePath}` },
                            });
                        });
                    }
                },
            }
        );
    }

    // Create dummy files for vite dev server
    if (command === "serve") {
        const message = "This file is for a running vite dev server and is not copied to a build";
        fs.writeFileSync("./index.html", `<h1>${message}</h1>\n`);
        fs.writeFileSync("./pf2e.css", `/** ${message} */\n`);
        fs.writeFileSync("./pf2e.mjs", `/** ${message} */\n\nimport "./src/pf2e.ts";\n`);
        fs.writeFileSync("./vendor.mjs", `/** ${message} */\n`);
    }

    return {
        root: "./",
        base: buildMode === "production" ? "./" : "/systems/pf2e/",
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
                        console.log(name);
                        return /\.css$/.test(name ?? "") ? "pf2e.css" : name ?? "what-is-this.txt";
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
        server: {
            port: 30001,
            open: "/game",
            proxy: {
                "^(?!/systems/pf2e/)": "http://localhost:30000/",
                "/socket.io": {
                    target: "ws://localhost:30000",
                    ws: true,
                },
            },
        },
        plugins,
    };
});

// eslint-disable-next-line import/no-default-export
export default config;
