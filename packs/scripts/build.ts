import * as path from "path";
import * as fs from "fs";
import { CompendiumPack, PackError } from "./packman/compendium-pack";

const packsDataPath = path.resolve(__dirname, "../data");
const packDirPaths = fs.readdirSync(packsDataPath).map((dirName) => path.resolve(__dirname, packsDataPath, dirName));

// Loads all packs into memory for the sake of making all entity name/id mappings available
const packs = packDirPaths.map((p) => CompendiumPack.loadJSON(p));
const documentCounts = packs.map((p) => p.save());
const total = documentCounts.reduce((total, c) => total + c, 0);

if (documentCounts.length > 0) {
    console.log(`Created ${documentCounts.length} packs with ${total} entities.`);
} else {
    throw PackError("No data available to build packs.");
}
