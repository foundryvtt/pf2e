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

export { getFilesRecursively, PackError };
