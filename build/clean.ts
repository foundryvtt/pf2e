import fs from "fs";
import path from "path";

// Clean output directory, or create build directory
const outDir = path.resolve(process.cwd(), "dist");
if (fs.existsSync(outDir)) {
    const filesToClean = fs.readdirSync(outDir).map((dirName) => path.resolve(outDir, dirName));
    for (const file of filesToClean) {
        fs.rmSync(file, { recursive: true });
    }
} else {
    fs.mkdirSync(outDir);
}

// Delete static/packs dir to prevent overwrite during rebuilds (temporary backwards compatibility)
const oldPacksDir = path.resolve(process.cwd(), "static/packs");
fs.rmSync(oldPacksDir, { recursive: true, force: true });
