import fs from "fs";
import process from "process";
import yargs, { Argv } from "yargs";
import { ExtractArgs, PackExtractor } from "./lib/extractor.ts";

const argv = yargs(process.argv.slice(2)) as Argv<ExtractArgs>;
const args = argv
    .command("$0 <packDb> [disablePresort] [logWarnings]", "Extract one or all compendium packs to ./packs", () => {
        argv.positional("packDb", {
            describe: 'A compendium pack folder name or otherwise "all"',
            coerce: (arg: string) => {
                return arg.toLowerCase();
            },
        })
            .option("system", {
                describe: "The FVTT for which to extract packs",
                type: "string",
                choices: ["pf2e", "sf2e"],
                default: "pf2e",
            })
            .option("disablePresort", {
                describe: "Turn off data item presorting",
                type: "boolean",
                default: false,
            })
            .option("logWarnings", {
                describe: "Turn on logging out warnings about extracted data",
                type: "boolean",
                default: true,
            })
            .example([
                ["npm run $0 spells  # extract only spells, from packs in dist/"],
                ["npm run $0 all     # as above, but extract everything"],
            ]);
    })
    .help(false)
    .version(false)
    .parseSync();

declare namespace globalThis {
    let SYSTEM_ID: SystemId;
}
globalThis.SYSTEM_ID = args.system;
const extractor = new PackExtractor(args);

try {
    const total = await extractor.run();
    await fs.promises.rm(extractor.tempDataPath, { recursive: true, force: true });
    console.log(`Extraction complete (${total} total documents).`);
} catch (error) {
    console.error(error);
    process.exit(1);
}
