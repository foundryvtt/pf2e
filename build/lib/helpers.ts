import { sluggify } from "@util/misc.ts";
import fs from "fs";
import path from "path";
import { DBFolder } from "./level-database.ts";

const PackError = (message: string): void => {
    console.error(`Error: ${message}`);
    process.exit(1);
};

function getPackJSONPaths(directory: string, systemId: string): string[] {
    const dirPath = path.resolve("packs", systemId, directory);
    try {
        return fs
            .readdirSync(dirPath, { recursive: true, encoding: "utf-8" })
            .filter((p) => p.endsWith(".json") && path.basename(p) !== "_folders.json")
            .map((p) => path.join(dirPath, p));
    } catch {
        return [];
    }
}

function getFolderPath(pack: { folders: DBFolder[]; dirName: string }, folder: DBFolder, parts: string[] = []): string {
    const { folders, dirName } = pack;
    if (parts.length > 3) {
        throw PackError(`Error: Maximum folder depth exceeded for "${folder.name}" in pack: ${dirName}`);
    }
    parts.unshift(sluggify(folder.name));
    if (folder.folder) {
        // This folder is inside another folder
        const parent = folders.find((f) => f._id === folder.folder);
        if (!parent) {
            throw PackError(`Error: Unknown parent folder id [${folder.folder}] in pack: ${dirName}`);
        }
        return getFolderPath(pack, parent, parts);
    }
    return path.join(...parts);
}

export { getFolderPath, getPackJSONPaths, PackError };
