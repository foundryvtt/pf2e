import fs from "fs";
import path from "path";
import * as R from "remeda";
import url from "url";
import { CompendiumPack, PackError } from "./lib/compendium-pack.ts";
import type { PackEntry } from "./lib/types.ts";

const asJson = process.argv[2]?.toLowerCase() === "json";
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const packsDataPath = path.resolve(__dirname, "../packs");
const packDirPaths = fs.readdirSync(packsDataPath).map((dirName) => path.resolve(__dirname, packsDataPath, dirName));

// Loads all packs into memory for the sake of making all document name/id mappings available
const packs = packDirPaths.map((p) => CompendiumPack.loadJSON(p));
const documentCounts = await Promise.all(packs.map((p) => p.save(asJson)));
const total = documentCounts.reduce((total, c) => total + c, 0);

if (documentCounts.length > 0) {
    console.log(`Created ${documentCounts.length} packs with ${total} documents.`);
} else {
    throw PackError("No data available to build packs.");
}

// Create migration sources JSON
const uuids = ((): string[] => {
    const filePath = path.resolve(__dirname, "../src/module/migration/compendium-documents.json");
    if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, { encoding: "utf-8" }));
    }
    return [];
})();
const sources: PackEntry[] = [];
for (const uuid of R.unique(uuids)) {
    const parts = uuid.split(".", 5);
    if (parts.length !== 5) continue;
    const [collection, system, packId, documentType, id] = parts;
    if (collection !== "Compendium" || system !== "pf2e") continue;
    const pack = packs.find((p) => p.packId === packId);
    if (!pack || pack.documentType !== documentType) continue;
    const source = pack.data.find((d) => d._id === id);
    if (!source) continue;
    sources.push(source);
}
if (sources.length > 0) {
    fs.writeFileSync(path.resolve(__dirname, "../migration-sources.json"), JSON.stringify(sources));
}
