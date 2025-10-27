import type { CompendiumUUID } from "@client/utils/helpers.d.mts";
import type { ConditionSource } from "@item/base/data/index.ts";
import { svelte as sveltePlugin } from "@sveltejs/vite-plugin-svelte";
import { execSync } from "child_process";
import esbuild from "esbuild";
import fs from "fs-extra";
import { globSync } from "glob";
import path from "path";
import Peggy from "peggy";
import * as Vite from "vite";
import checker from "vite-plugin-checker";
import { viteStaticCopy } from "vite-plugin-static-copy";
import tsconfigPaths from "vite-tsconfig-paths";
import packageJSON from "./package.json" with { type: "json" };
import { sluggify } from "./src/util/misc.ts";
import systemJSON from "./static/system.json" with { type: "json" };

const SYSTEM_ID = "pf2e" as "pf2e" | "sf2e";
const CONDITION_SOURCES = ((): ConditionSource[] => {
    const output = execSync("npm run build:conditions", { encoding: "utf-8" });
    return JSON.parse(output.slice(output.indexOf("[")));
})();
const EN_JSON = JSON.parse(fs.readFileSync("./static/lang/en.json", { encoding: "utf-8" }));

/** Get UUID redirects from JSON file, converting names to IDs. */
function getUuidRedirects(): Record<CompendiumUUID, CompendiumUUID> {
    const redirectJSON = JSON.parse(fs.readFileSync(path.resolve(__dirname, "build/uuid-redirects.json"), "utf-8"));
    for (const [from, to] of Object.entries<string>(redirectJSON)) {
        const [, , pack, documentType, name] = to.split(".", 5);
        const packDir = systemJSON.packs.find((p) => p.type === documentType && p.name === pack)?.path;
        const dirPath = path.resolve(__dirname, packDir ?? "");
        const filename = `${sluggify(name)}.json`;
        const jsonPath = fs.existsSync(path.resolve(dirPath, filename))
            ? path.resolve(dirPath, filename)
            : globSync(path.resolve(dirPath, "**", filename), { windowsPathsNoEscape: true }).at(0);
        if (!jsonPath) throw new Error(`Failure looking up pack JSON for ${to}`);
        const docJSON = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
        const id = docJSON._id;
        if (!id) throw new Error(`No UUID redirect match found for ${documentType} ${name} in ${pack}`);
        redirectJSON[from] = `Compendium.pf2e.${pack}.${documentType}.${id}`;
    }

    return redirectJSON;
}

const config = Vite.defineConfig(({ command, mode }): Vite.UserConfig => {
    const buildMode = mode === "production" ? "production" : "development";
    const outDir = "dist";

    const rollGrammar = fs.readFileSync("roll-grammar.peggy", { encoding: "utf-8" });
    const ROLL_PARSER = Peggy.generate(rollGrammar, { output: "source" }).replace(
        'return {\n    StartRules: ["Expression"],\n    SyntaxError: peg$SyntaxError,\n    parse: peg$parse,\n  };',
        'AbstractDamageRoll.parser = { StartRules: ["Expression"], SyntaxError: peg$SyntaxError, parse: peg$parse };',
    );

    const { foundryPort, serverPort } =
        command === "serve"
            ? (() => {
                  // Load foundry config if available to potentially use a different port
                  const FOUNDRY_CONFIG = fs.existsSync("./foundryconfig.json")
                      ? JSON.parse(fs.readFileSync("./foundryconfig.json", { encoding: "utf-8" }))
                      : null;
                  const foundryPort = Number(FOUNDRY_CONFIG?.foundryPort) || 30000;
                  const serverPort = Number(FOUNDRY_CONFIG?.port) || 30001;
                  console.log(`Connecting to foundry hosted at http://localhost:${foundryPort}/`);
                  return { foundryPort, serverPort };
              })()
            : { foundryPort: 30000, serverPort: 30001 };

    // Add system layer to svelte CSS in HMR
    const hmrPreprocess = {
        name: "svelte-hmr-layer",
        style: ({ content }: { content: string }) => ({ code: `@layer system { ${content} }` }),
    };

    const plugins = [
        checker({ typescript: true }),
        tsconfigPaths({ loose: true }),
        sveltePlugin({
            preprocess: command === "serve" ? hmrPreprocess : undefined,
        }),
    ];
    // Handle minification after build to allow for tree-shaking and whitespace minification
    // "Note the build.minify option does not minify whitespaces when using the 'es' format in lib mode, as it removes
    // pure annotations and breaks tree-shaking."
    if (buildMode === "production") {
        plugins.push(
            {
                name: "minify",
                renderChunk: {
                    order: "post",
                    async handler(code, chunk) {
                        return chunk.fileName.endsWith(".mjs")
                            ? esbuild.transform(code, {
                                  keepNames: true,
                                  minifyIdentifiers: false,
                                  minifySyntax: true,
                                  minifyWhitespace: true,
                              })
                            : code;
                    },
                },
            },
            ...viteStaticCopy({
                targets: [
                    { src: "CHANGELOG.md", dest: "." },
                    { src: "README.md", dest: "." },
                    { src: "CONTRIBUTING.md", dest: "." },
                ],
            }),
        );
    } else {
        plugins.push(
            // Foundry expects all esm files listed in system.json to exist: create empty vendor module when in dev mode
            {
                name: "touch-vendor-mjs",
                apply: "build",
                writeBundle: {
                    async handler() {
                        fs.closeSync(fs.openSync(path.resolve(outDir, "vendor.mjs"), "w"));
                    },
                },
            },
            // Vite HMR is only preconfigured for css files: add handler for HBS templates and localization JSON
            {
                name: "hmr-handler",
                apply: "serve",
                handleHotUpdate(context) {
                    if (context.file.startsWith(outDir)) return;

                    if (context.file.endsWith("en.json")) {
                        const basePath = context.file.slice(context.file.indexOf("lang/"));
                        console.debug(`Updating lang file at ${basePath}`);
                        fs.promises.copyFile(context.file, `${outDir}/${basePath}`).then(() => {
                            context.server.ws.send({
                                type: "custom",
                                event: "lang-update",
                                data: { path: `systems/pf2e/${basePath}` },
                            });
                        });
                    } else if (context.file.endsWith(".hbs")) {
                        const basePath = context.file.slice(context.file.indexOf("templates/"));
                        console.debug(`Updating template file at ${basePath}`);
                        fs.promises.copyFile(context.file, `${outDir}/${basePath}`).then(() => {
                            context.server.ws.send({
                                type: "custom",
                                event: "template-update",
                                data: { path: `systems/pf2e/${basePath}` },
                            });
                        });
                    }
                },
            },
        );

        // Add system CSS layer for HMR
        const mainCss = path.resolve(__dirname, "src/pf2e.ts").split(path.sep).join("/");
        plugins.push({
            name: "hmr-layers",
            apply: "serve",
            transform: (code, id) => {
                if (id === mainCss) {
                    return code.replace("styles/main.scss", "styles/vite-hmr.scss");
                } else if (/node_modules\/.+\.css$/.test(id)) {
                    return `@layer system { ${code} }`;
                }
                return;
            },
        });
    }

    // Create dummy files for vite dev server
    if (command === "serve") {
        const message = "This file is for a running vite dev server and is not copied to a build";
        fs.writeFileSync("./index.html", `<h1>${message}</h1>\n`);
        if (!fs.existsSync("./styles")) fs.mkdirSync("./styles");
        fs.writeFileSync("./styles/pf2e.css", `/** ${message} */\n`);
        fs.writeFileSync("./pf2e.mjs", `/** ${message} */\n\nimport "./src/pf2e.ts";\n`);
        fs.writeFileSync("./vendor.mjs", `/** ${message} */\n`);
    }

    const reEscape = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

    return {
        base: command === "build" ? "./" : "/systems/pf2e/",
        publicDir: "static",
        define: {
            SYSTEM_ID: JSON.stringify(SYSTEM_ID),
            BUILD_MODE: JSON.stringify(buildMode),
            CONDITION_SOURCES: JSON.stringify(CONDITION_SOURCES),
            EN_JSON: JSON.stringify(EN_JSON),
            ROLL_PARSER: JSON.stringify(ROLL_PARSER),
            UUID_REDIRECTS: JSON.stringify(getUuidRedirects()),
            fa: "foundry.applications",
            fav1: "foundry.appv1",
            fc: "foundry.canvas",
            fd: "foundry.documents",
            fh: "foundry.helpers",
            fu: "foundry.utils",
        },
        esbuild: { keepNames: true },
        build: {
            outDir,
            emptyOutDir: false, // Fails if world is running due to compendium locks: handled with `npm run clean`
            minify: false,
            sourcemap: buildMode === "development",
            lib: {
                name: "pf2e",
                entry: "src/pf2e.ts",
                formats: ["es"],
                fileName: "pf2e",
            },
            rollupOptions: {
                external: new RegExp(
                    [
                        "(?:",
                        reEscape("../icons/weapons/"),
                        "[-a-z/]+",
                        reEscape(".webp"),
                        "|",
                        reEscape("ui/parchment.jpg"),
                        ")$",
                    ].join(""),
                ),
                output: {
                    assetFileNames: "styles/pf2e.css",
                    chunkFileNames: "[name].mjs",
                    entryFileNames: "pf2e.mjs",
                    manualChunks: {
                        vendor: buildMode === "production" ? Object.keys(packageJSON.dependencies) : [],
                    },
                },
                watch: { buildDelay: 100 },
            },
            target: "es2022",
        },
        server: {
            port: serverPort,
            open: "/game",
            proxy: {
                "^(?!/systems/pf2e/)": `http://localhost:${foundryPort}/`,
                "/socket.io": {
                    target: `ws://localhost:${foundryPort}`,
                    ws: true,
                },
            },
        },
        plugins,
        css: {
            devSourcemap: buildMode === "development",
            preprocessorOptions: {
                scss: {
                    additionalData: (existing: string) => {
                        return SYSTEM_ID === "sf2e" ? `${existing}\n@import "sf2e/index";` : existing;
                    },
                },
            },
        },
    };
});

export default config;
