import { sluggify } from "@util/misc.ts";
import fs from "fs";
import path from "path";
import { DBFolder } from "./level-database.ts";

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

export { getFilesRecursively, getFolderPath, PackError };
