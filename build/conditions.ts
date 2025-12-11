import { CompendiumPack } from "./lib/compendium-pack.ts";

const options = { systemId: "pf2e" } as const;
CompendiumPack.loadJSON("actions", options);
CompendiumPack.loadJSON("adventure-specific-actions", options);
CompendiumPack.loadJSON("bestiary-ability-glossary-srd", options);
CompendiumPack.loadJSON("spells", options);
const conditions = [
    CompendiumPack.loadJSON("conditions", options).finalizeAll(),
    CompendiumPack.loadJSON("campaign-effects", options)
        .finalizeAll()
        .filter((e) => "type" in e && e.type === "condition"),
].flat();
console.log(JSON.stringify(conditions));
