import yargs, { Argv } from "yargs";
import { CompendiumPack } from "./lib/compendium-pack.ts";

const argv = yargs(process.argv.slice(2)) as Argv<{ system: SystemId; json: boolean }>;
const args = argv
    .command("$0 [system]", "Bundle condition items with a system build", () => {
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
const options = { systemId: args.system };
CompendiumPack.loadJSON("actions", options);
if (options.systemId === "pf2e") {
    CompendiumPack.loadJSON("adventure-specific-actions", options);
}
CompendiumPack.loadJSON("bestiary-ability-glossary-srd", options);
CompendiumPack.loadJSON("spells", options);
const conditions = [...CompendiumPack.loadJSON("conditions", options).finalizeAll()];
if (options.systemId === "pf2e") {
    conditions.push(
        ...CompendiumPack.loadJSON("campaign-effects", options)
            .finalizeAll()
            .filter((e) => "type" in e && e.type === "condition"),
    );
}
console.log(JSON.stringify(conditions));
