import fs from "fs";
import path from "path";
import process from "process";
import prompts from "prompts";

const windowsInstructions = process.platform === "win32" ? ' Start with a drive letter ("C:\\").' : "";
const dataPath: string | undefined = (
    await prompts({
        type: "text",
        name: "value",
        format: (v: string) => v.replace(/\W*$/, "").trim(),
        message: `Enter the full path to your Foundry data folder.${windowsInstructions}`,
    })
).value;
if (!dataPath || !/\bData$/.test(dataPath)) {
    console.error(`"${dataPath}" does not look like a Foundry data folder.`);
    process.exit(1);
}
const dataPathStats = fs.lstatSync(dataPath, { throwIfNoEntry: false });
if (!dataPathStats?.isDirectory()) {
    console.error(`No folder found at "${dataPath}"`);
    process.exit(1);
}

const symlinkPath = path.resolve(dataPath, "systems", "pf2e");
const symlinkStats = fs.lstatSync(symlinkPath, { throwIfNoEntry: false });
if (symlinkStats) {
    const atPath = symlinkStats.isDirectory() ? "folder" : symlinkStats.isSymbolicLink() ? "symlink" : "file";
    const proceed: boolean = (
        await prompts({
            type: "confirm",
            name: "value",
            initial: false,
            message: `A "pf2e" ${atPath} already exists in the "systems" subfolder. Replace with new symlink?`,
        })
    ).value;
    if (!proceed) {
        console.log("Aborting.");
        process.exit();
    }
}

try {
    if (symlinkStats?.isDirectory()) {
        fs.rmSync(symlinkPath, { recursive: true, force: true });
    } else if (symlinkStats) {
        fs.unlinkSync(symlinkPath);
    }
    fs.symlinkSync(path.resolve(process.cwd(), "dist"), symlinkPath);
} catch (error) {
    if (error instanceof Error) {
        console.error(`An error was encountered trying to create a symlink: ${error.message}`);
        process.exit(1);
    }
}

console.log(`Symlink successfully created at "${symlinkPath}"!`);
