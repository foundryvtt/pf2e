import { CompendiumPack } from "./lib/compendium-pack.js";

CompendiumPack.loadJSON("packs/actions");
const conditions = CompendiumPack.loadJSON("packs/conditions").finalizeAll();
console.log(JSON.stringify(conditions));
