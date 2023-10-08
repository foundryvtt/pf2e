import fs from "fs";
import path from "path";

const PackError = (message: string): void => {
    console.error(`Error: ${message}`);
    process.exit(1);
};

const getFilesRecursively = (directory: string, filePaths: string[] = []): string[] => {
    const filesInDirectory = fs.readdirSync(directory);
    for (const file of filesInDirectory) {
        const absolute = path.join(directory, file);
        if (fs.lstatSync(absolute).isDirectory()) {
            getFilesRecursively(absolute, filePaths);
        } else {
            if (file === "_folders.json" || !file.endsWith(".json")) continue;
            filePaths.push(absolute);
        }
    }
    return filePaths;
};

const deepClone = <T>(original: T): T => {
    // Simple types
    if (typeof original !== "object" || original === null) return original;

    // Arrays
    if (Array.isArray(original)) return original.map(deepClone) as unknown as T;

    // Dates
    if (original instanceof Date) return new Date(original) as T & Date;

    // Unsupported advanced objects
    if ("constructor" in original && (original as { constructor?: unknown })["constructor"] !== Object) return original;

    // Other objects
    const clone: Record<string, unknown> = {};
    for (const k of Object.keys(original)) {
        clone[k] = deepClone((original as Record<string, unknown>)[k]);
    }
    return clone as T;
};

export { deepClone, getFilesRecursively, PackError };
