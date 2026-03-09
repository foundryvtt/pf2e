import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { Worker } from "worker_threads";
import { CompendiumPack, PackError } from "./compendium-pack.ts";
import { sluggify } from "@util/misc.ts";

interface WorkerPackResult {
    dirName: string;
    data: unknown[];
    folders: unknown[];
    systemId: SystemId;
    filePaths: string[];
}

function buildPackFromWorkerResult(r: WorkerPackResult): CompendiumPack {
    for (let i = 0; i < r.data.length; i++) {
        const doc = r.data[i] as { name?: string };
        const documentName = doc?.name;
        if (!documentName) {
            throw PackError(`Document in ${r.dirName} at index ${i} has no name.`);
        }
        const expectedName = sluggify(documentName).concat(".json");
        if (path.basename(r.filePaths[i]) !== expectedName) {
            throw PackError(
                `Filename at ${r.filePaths[i]} does not reflect document name (should be ${expectedName}).`,
            );
        }
    }
    return new CompendiumPack({
        dirName: r.dirName,
        data: r.data,
        folders: r.folders,
        systemId: r.systemId,
    });
}

/**
 * Load compendium packs in parallel via worker threads (file I/O + JSON parse).
 * Validates filenames vs document names and constructs CompendiumPack instances
 * so that #namesToIds is populated before any pack is saved.
 */
export async function loadPacksInParallel(packDirNames: string[], systemId: SystemId): Promise<CompendiumPack[]> {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const workerPath = path.join(__dirname, "pack-loader-worker.ts");
    const concurrency = Math.min(packDirNames.length, (os.cpus().length ?? 4) * 2, 16);
    const queue = [...packDirNames];
    const results: WorkerPackResult[] = [];

    function loadPackInWorker(packDirName: string): Promise<WorkerPackResult> {
        return new Promise((resolve, reject) => {
            const worker = new Worker(workerPath, {
                workerData: { packDirName, systemId },
                execArgv: ["--import", "tsx"],
            });
            worker.on("message", (msg: WorkerPackResult | { error: { message: string; stack?: string } }) => {
                worker.terminate();
                if ("error" in msg) {
                    const err = new Error(msg.error.message);
                    if (msg.error.stack) err.stack = msg.error.stack;
                    reject(err);
                } else {
                    resolve(msg);
                }
            });
            worker.on("error", reject);
        });
    }

    async function runOne(): Promise<void> {
        const packDirName = queue.shift();
        if (packDirName === undefined) return;
        const result = await loadPackInWorker(packDirName);
        results.push(result);
        await runOne();
    }

    await Promise.all(Array.from({ length: concurrency }, () => runOne()));

    return results.map(buildPackFromWorkerResult);
}
