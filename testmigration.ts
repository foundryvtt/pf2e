import * as fs from "fs";
import * as path from "path";
import { sluggify } from "./src/util/misc.ts";
import { NPCSource } from "./src/module/actor/npc/data.ts";
import { SkillAbbreviation } from "./src/module/actor/types.ts";
import { ItemSourcePF2e } from "./src/module/item/base/data/index.ts";
import { SKILL_DICTIONARY } from "./src/module/actor/values.ts";

const baseDir = "../pf2e";

const abilityMap: Record<string, { attribute: string; shortForm: SkillAbbreviation }> = {
    acrobatics: { attribute: "dex", shortForm: "acr" },
    arcana: { attribute: "int", shortForm: "arc" },
    athletics: { attribute: "str", shortForm: "ath" },
    crafting: { attribute: "int", shortForm: "cra" },
    deception: { attribute: "cha", shortForm: "dec" },
    diplomacy: { attribute: "cha", shortForm: "dip" },
    intimidation: { attribute: "cha", shortForm: "itm" },
    medicine: { attribute: "wis", shortForm: "med" },
    nature: { attribute: "wis", shortForm: "nat" },
    occultism: { attribute: "int", shortForm: "occ" },
    performance: { attribute: "cha", shortForm: "prf" },
    religion: { attribute: "wis", shortForm: "rel" },
    society: { attribute: "int", shortForm: "soc" },
    stealth: { attribute: "dex", shortForm: "ste" },
    survival: { attribute: "wis", shortForm: "sur" },
    thievery: { attribute: "dex", shortForm: "thi" },
};

const printed: string[] = [];
function handleFolder(folder: string, _compendium: string) {
    // console.log(`${folder} : ${compendium}`);
    for (const comp of fs.readdirSync(folder, { withFileTypes: true })) {
        if (!comp.isDirectory() && comp.isFile()) {
            const file = path.join(folder, comp.name);
            const rawActor = JSON.parse(fs.readFileSync(file, "utf8"));
            if (!["npc"].includes(rawActor.type)) continue;
            // if (rawActor.name !== "Abyssal Bunny Swarm") continue;
            const actor = rawActor as NPCSource;

            actor.system.skills = {};
            actor.system.lores = [];

            const appendedItems: any[] = [];
            for (const item of actor.items) {
                if (item.type === "lore") {
                    const ability = abilityMap[item.name.toLowerCase()];
                    if (ability === undefined) {
                        // this is a lore. lores don't have variants
                        // console.log(`${actor.name} ${item.name}`);
                        actor.system.lores.push({
                            name: item.name,
                            value: item.system.mod.value,
                        });
                        continue;
                    }

                    const currentSkill: { value: number; variants?: any[] } = {
                        value: item.system.mod.value,
                    };

                    const variants = item.system.variants as Record<string, any>;
                    if (variants !== undefined && Object.values(variants).length > 0) {
                        currentSkill.variants = [];
                        for (const variant of Object.values(variants)) {
                            variant.label = variant.label.replace(/^[-+]?\d+ /, "");

                            if (!printed.includes(variant.label)) {
                                printed.push(variant.label);
                            }

                            if (item.system.rules.length === 0) {
                                // console.log(`${actor.name} - ${variant.label} - ${variant.options}`);
                                currentSkill.variants.push({
                                    label: variant.label,
                                    skill: SKILL_DICTIONARY[ability.shortForm],
                                    value: 0,
                                    predicate: [],
                                });
                            } else if (item.system.rules.length === 1 && item.system.rules[0].key === "FlatModifier") {
                                // console.log(
                                //     `${actor.name} - ${variant.label} - ${variant.options} - ${JSON.stringify(
                                //         item.system.rules,
                                //         null,
                                //         4,
                                //     )}`,
                                // );
                                const re = item.system.rules[0];
                                currentSkill.variants.push({
                                    label: variant.label,
                                    skill: SKILL_DICTIONARY[ability.shortForm],
                                    value: item.system.mod.value + (re.value as number),
                                    predicate: re.predicate,
                                });
                            } else {
                                // convert this one to passive
                                // console.log(`${actor.name} - ${variant.label} - ${variant.options} - ${JSON.stringify(item.system.rules, null, 4)}`);
                                currentSkill.variants.push({
                                    label: variant.label,
                                    skill: SKILL_DICTIONARY[ability.shortForm],
                                    value: 0,
                                    predicate: [],
                                });
                                appendedItems.push({
                                    _id: item._id,
                                    img: "systems/pf2e/icons/actions/Passive.webp",
                                    name: variant.label,
                                    sort: item.sort,
                                    type: "action",
                                    system: {
                                        actionType: {
                                            value: "passive",
                                        },
                                        actions: {
                                            value: null,
                                        },
                                        category: "defensive",
                                        description: {
                                            gm: "",
                                            value: "",
                                        },
                                        publication: item.system.publication,
                                        rules: item.system.rules,
                                        slug: sluggify(variant.label),
                                        traits: item.system.traits,
                                    },
                                });
                            }
                        }
                    }

                    actor.system.skills[ability.shortForm] = currentSkill;
                }
            }

            actor.items = actor.items.filter((item) => item.type !== "lore").concat(appendedItems);

            fs.writeFileSync(file, JSON.stringify(actor, null, 4), "utf8");
        }
    }
}

const systemJson = JSON.parse(fs.readFileSync(path.join(baseDir, "static", "system.json"), "utf8"));
for (const comp of systemJson.packs) {
    handleFolder(path.join(baseDir, comp.path), `Compendium.pf2e.${comp.name}`);
}

printed.sort();
for (const p of printed) console.log(p);
console.log(printed.length);

// fs.writeFileSync("src/web/npclookup.json", JSON.stringify(npcLookup, null, 4));
