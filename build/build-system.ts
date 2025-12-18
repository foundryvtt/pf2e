import { execSync } from "child_process";
import yargs, { Argv } from "yargs";

const argv = yargs(process.argv.slice(2)) as Argv<{ system: SystemId; json: boolean }>;
const args = argv
    .command("$0 [system]", "Build a system's (es)module", () => {
        argv.option("system", {
            describe: "The FVTT system for which to build packs",
            type: "string",
            choices: ["pf2e", "sf2e"],
            default: "pf2e",
        });
    })
    .help(false)
    .version(false)
    .parseSync();
console.log(`Building system: ${args.system}`);
process.env.SYSTEM_ID = args.system;
execSync("npx vite build", { encoding: "utf-8", stdio: "inherit" });
