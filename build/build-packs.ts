import fs from "fs";
import path from "path";
import url from "url";
import { CompendiumPack, PackError } from "./lib/compendium-pack.ts";

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
