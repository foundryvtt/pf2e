import fs from "fs";
import path from "path";
import url from "url";
import yargs, { Argv } from "yargs";
import { CompendiumPack, PackError } from "./lib/compendium-pack.ts";

const argv = yargs(process.argv.slice(2)) as Argv<{ system: SystemId; json: boolean }>;
const args = argv
    .command("$0 [system] [json]", "Build compendium packs into LevelDB databases or JSON assets", () => {
        argv.option("system", {
            describe: "The FVTT system for which to build packs",
            type: "string",
            choices: ["pf2e", "sf2e"],
            default: "pf2e",
        }).option("json", {
            describe: "Create JSON assets for translator distrubition",
            type: "boolean",
            default: false,
        });
    })
    .help(false)
    .version(false)
    .parseSync();

declare namespace globalThis {
    let SYSTEM_ID: SystemId;
}
globalThis.SYSTEM_ID = args.system;

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const packsDataPath = path.resolve(__dirname, "..", "packs", args.system);

// Loads all packs into memory for the sake of making all document name/id mappings available
const packs = fs.readdirSync(packsDataPath).map((p) => CompendiumPack.loadJSON(p));
const documentCounts = await Promise.all(packs.map((p) => p.save({ jsonArtifacts: args.json })));
const total = documentCounts.reduce((total, c) => total + c, 0);

if (documentCounts.length > 0) {
    console.log(`Created ${documentCounts.length} packs with ${total} documents.`);
} else {
    throw PackError("No data available to build packs.");
}
