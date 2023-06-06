import fs from "fs";
import process from "process";
import yargs, { Argv } from "yargs";
import { PackExtractor, ExtractArgs } from "./lib/extractor.ts";

const argv = yargs(process.argv.slice(2)) as Argv<ExtractArgs>;
const args = argv
    .command("$0 <packDb> [disablePresort] [logWarnings]", "Extract one or all compendium packs to ./packs", () => {
        argv.positional("packDb", {
            describe: 'A compendium pack folder name or otherwise "all"',
            coerce: (arg: string) => {
                return arg.toLowerCase();
            },
        })
            .option("disablePresort", {
                describe: "Turns off data item presorting.",
                type: "boolean",
                default: false,
            })
            .option("logWarnings", {
                describe: "Turns on logging out warnings about extracted data.",
                type: "boolean",
                default: true,
            })
            .example([
                ["npm run $0 spells /path/to/foundryvtt/Config/options.json"],
                ["npm run $0 spells C:\\Users\\me\\this\\way\\to\\options.json"],
                ["npm run $0 spells # copy of config at ./foundryconfig.json or otherwise using dist/"],
                ["npm run $0 all       # same"],
            ]);
    })
    .help(false)
    .version(false)
    .parseSync();

const extractor = new PackExtractor(args);

try {
    const total = await extractor.run();
    await fs.promises.rm(extractor.tempDataPath, { recursive: true, force: true });
    console.log(`Extraction complete (${total} total documents).`);
} catch (error) {
    console.error(error);
    process.exit(1);
}
