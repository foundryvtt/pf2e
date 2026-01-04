import yargs, { Argv } from "yargs";

declare namespace globalThis {
    let SYSTEM_ID: string;
}

const argv = yargs(process.argv.slice(2)) as Argv<{ system: SystemId; json: boolean }>;
const args = argv
    .command("$0 [system]", "Build a system's (es)modules", () => {
        argv.option("system", {
            describe: "The FVTT system for which to build the modules",
            type: "string",
            choices: ["pf2e", "sf2e"],
            default: "pf2e",
        });
    })
    .help(false)
    .version(false)
    .parseSync();

globalThis.SYSTEM_ID = args.system;
