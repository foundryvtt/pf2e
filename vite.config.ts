import type { ConditionSource } from "@item/base/data/index.ts";
import { execSync } from "child_process";
import esbuild from "esbuild";
import fs from "fs-extra";
import path from "path";
import Peggy from "peggy";
import * as Vite from "vite";
import checker from "vite-plugin-checker";
import { viteStaticCopy } from "vite-plugin-static-copy";
import tsconfigPaths from "vite-tsconfig-paths";
import packageJSON from "./package.json";
import { sluggify } from "./src/util/misc.ts";
import systemJSON from "./static/system.json";

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
        if (!packDir) throw new Error(`Failure looking up pack JSON for ${to}`);
        const docJSON = JSON.parse(
            fs.readFileSync(path.resolve(__dirname, `${packDir}/${sluggify(name)}.json`), "utf-8"),
        );
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
        'return {\n    StartRules: ["Expression"],\n    SyntaxError: peg$SyntaxError,\n    parse: peg$parse\n  };',
        'AbstractDamageRoll.parser = { StartRules: ["Expression"], SyntaxError: peg$SyntaxError, parse: peg$parse };',
    );

    const plugins = [checker({ typescript: true }), tsconfigPaths()];
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
            // Vite HMR is only preconfigured for css files: add handler for HBS templates
            {
                name: "hmr-handler",
                apply: "serve",
                handleHotUpdate(context) {
                    if (context.file.startsWith(outDir)) return;

                    if (context.file.endsWith("en.json")) {
                        const basePath = context.file.slice(context.file.indexOf("lang/"));
                        console.log(`Updating lang file at ${basePath}`);
                        fs.promises.copyFile(context.file, `${outDir}/${basePath}`).then(() => {
                            context.server.ws.send({
                                type: "custom",
                                event: "lang-update",
                                data: { path: `systems/pf2e/${basePath}` },
                            });
                        });
                    } else if (context.file.endsWith(".hbs")) {
                        const basePath = context.file.slice(context.file.indexOf("templates/"));
                        console.log(`Updating template file at ${basePath}`);
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

    const reEscape = (s: string) => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");

    return {
        base: command === "build" ? "./" : "/systems/pf2e/",
        publicDir: "static",
        define: {
            BUILD_MODE: JSON.stringify(buildMode),
            CONDITION_SOURCES: JSON.stringify(CONDITION_SOURCES),
            EN_JSON: JSON.stringify(EN_JSON),
            ROLL_PARSER: JSON.stringify(ROLL_PARSER),
            UUID_REDIRECTS: JSON.stringify(getUuidRedirects()),
            fu: "foundry.utils",
        },
        esbuild: { keepNames: true },
        build: {
            outDir,
            emptyOutDir: false, // fails if world is running due to compendium locks. We do it in "npm run clean" instead.
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
                        reEscape("../../icons/weapons/"),
                        "[-a-z/]+",
                        reEscape(".webp"),
                        "|",
                        reEscape("../ui/parchment.jpg"),
                        ")$",
                    ].join(""),
                ),
                output: {
                    assetFileNames: ({ name }): string => (name === "style.css" ? "styles/pf2e.css" : name ?? ""),
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
        css: {
            devSourcemap: buildMode === "development",
        },
    };
});

export default config;
