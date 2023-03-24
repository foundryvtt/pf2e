import * as path from "path";
import * as fs from "fs";
import { CompendiumPack, PackError } from "./packman/compendium-pack";

const packsDataPath = path.resolve(__dirname, "../data");
const packDirPaths = fs.readdirSync(packsDataPath).map((dirName) => path.resolve(__dirname, packsDataPath, dirName));
const lastChangedFile = path.resolve(process.cwd(), ".pack-changes.json");

(() => {
    const lastChanged: Record<string, Record<string, number>> = {};
    for (const dir of packDirPaths) {
        const dirName = path.basename(dir);
        lastChanged[dirName] ??= {};
        const files = fs.readdirSync(dir).map((fileName) => path.resolve(__dirname, dir, fileName));
        for (const file of files) {
            const stats = fs.statSync(file);
            lastChanged[dirName][path.basename(file)] = stats.mtimeMs;
        }
    }
    const currentData = JSON.stringify(lastChanged);

    if (fs.existsSync(lastChangedFile)) {
        const lastChangedData = fs.readFileSync(lastChangedFile, { encoding: "utf-8" });
        if (currentData === lastChangedData) {
            console.log("Pack data is unchanged. Skipping rebuild.");
            return;
        } else {
            fs.writeFileSync(lastChangedFile, currentData);
        }
    } else {
        fs.writeFileSync(lastChangedFile, currentData);
    }

    // Loads all packs into memory for the sake of making all entity name/id mappings available
    const packs = packDirPaths.map((p) => CompendiumPack.loadJSON(p));
    const documentCounts = packs.map((p) => p.save());
    const total = documentCounts.reduce((total, c) => total + c, 0);

    if (documentCounts.length > 0) {
        console.log(`Created ${documentCounts.length} packs with ${total} entities.`);
    } else {
        throw PackError("No data available to build packs.");
    }
})();
