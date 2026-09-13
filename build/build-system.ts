import { execSync } from "child_process";
import yargs, { Argv } from "yargs";

type BuildMode = "production" | "development";
const argv = yargs(process.argv.slice(2)) as Argv<{ system: SystemId; json: boolean; mode: BuildMode }>;
const args = argv
    .command("$0 [system]", "Build a system's (es)modules", () => {
        argv.option("system", {
            describe: "The FVTT system for which to build the modules",
            type: "string",
            choices: ["pf2e", "sf2e"],
            default: "pf2e",
        });
        argv.option("mode", {
            describe: "The build mode to use with vite",
            type: "string",
            choices: ["production", "development"],
            default: "production",
        });
    })
    .help(false)
    .version(false)
    .parseSync();
console.log(`Building system: ${args.system}`);
process.env.SYSTEM_ID = args.system;
execSync(`npx vite build --mode=${args.mode}`, { encoding: "utf-8", stdio: "inherit" });
