/**
 * Minimal worker that only does file I/O and JSON parsing.
 * Used for parallelization of pack loading.
 */
import fs from "fs";
import path from "path";
import { parentPort, workerData } from "worker_threads";

const { packDirName, systemId } = workerData as { packDirName: string; systemId: string };
const dirPath = path.join(process.cwd(), "packs", systemId, packDirName);

try {
    const jsonFiles = fs
        .readdirSync(dirPath, { recursive: true, encoding: "utf-8" })
        .filter((p) => p.endsWith(".json") && path.basename(p) !== "_folders.json")
        .map((p) => path.join(dirPath, p));

    const data: unknown[] = [];
    for (const filePath of jsonFiles) {
        const jsonString = fs.readFileSync(filePath, "utf-8");
        data.push(JSON.parse(jsonString));
    }

    const foldersPath = path.join(dirPath, "_folders.json");
    const folders: unknown[] = fs.existsSync(foldersPath)
        ? (JSON.parse(fs.readFileSync(foldersPath, "utf-8")) as unknown[])
        : [];

    parentPort?.postMessage({
        dirName: packDirName,
        data,
        folders,
        systemId,
        filePaths: jsonFiles,
    });
} catch (err) {
    parentPort?.postMessage({
        error: err instanceof Error ? { message: err.message, stack: err.stack } : String(err),
    });
}
