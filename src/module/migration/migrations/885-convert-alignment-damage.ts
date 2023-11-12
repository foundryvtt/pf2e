import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { NPCAttackDamageSource } from "@item/melee/data.ts";
import { isObject } from "@util";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/** Replace all alignment damage and IWR with spirit damage and/or the holy trait */
export class Migration885ConvertAlignmentDamage extends MigrationBase {
    static override version = 0.885;

    #ALIGNMENT_DAMAGE_TYPES = ["good", "evil", "lawful", "chaotic"];

    #ALIGNMENT_VERSATILE_TRAITS = this.#ALIGNMENT_DAMAGE_TYPES.map((dt) => `versatile-${dt}`);

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        const traits: { value: string[] } =
            source.type === "character" ? { value: [] } : source.system.traits ?? { value: [] };
        if (!source.system.attributes.immunities) return;

        const iwrKeys = ["immunities", "weaknesses", "resistances"] as const;
        const iwr: WeaklyTypedIWR = R.pick(source.system.attributes, iwrKeys);

        for (const key of iwrKeys) {
            iwr[key] = iwr[key]?.filter((i) => !["chaotic", "lawful"].includes(i.type));
            for (const obj of [...(iwr[key] ?? [])]) {
                obj.type = obj.type.replace("good", "holy").replace("evil", "unholy");
                obj.exceptions = obj.exceptions
                    ?.filter((e) => isObject(e) || !["chaotic", "lawful"].includes(e))
                    .map((e) => (e === "evil" ? "unholy" : e === "good" ? "holy" : e));
                if (obj.type === "holy") {
                    traits.value.push(key === "immunities" ? "holy" : "unholy");
                    if (key === "immunities") {
                        iwr.immunities?.splice(iwr.immunities.indexOf(obj), 1);
                    }
                } else if (obj.type === "unholy") {
                    traits.value.push(key === "immunities" ? "unholy" : "holy");
                    if (key === "immunities") {
                        iwr.immunities?.splice(iwr.immunities.indexOf(obj), 1);
                    }
                }
            }
        }

        mergeObject(source.system.attributes, iwr);
        traits.value = R.uniq(traits.value.sort());
        if (traits.value.includes("holy") && traits.value.includes("unholy")) {
            // Something weird about this one!
            traits.value = traits.value.filter((t) => !["holy", "unholy"].includes(t));
        }
    }

    override async updateItem(source: ItemSourcePF2e, actorSource?: ActorSourcePF2e): Promise<void> {
        if (source.type === "weapon") {
            const traits: { value: string[] } = source.system.traits;
            traits.value = R.compact(
                traits.value.map((t) => (this.#ALIGNMENT_VERSATILE_TRAITS.includes(t) ? "versatile-spirit" : t)),
            );
            if (traits.value.some((t) => ["good", "evil"].includes(t))) {
                traits.value.push("sanctified");
            }
            if (this.#ALIGNMENT_DAMAGE_TYPES.includes(source.system.damage.damageType)) {
                source.system.damage.damageType = "spirit";
            }
            traits.value = R.uniq(traits.value.sort());
        } else if (source.type === "melee") {
            const traits: { value: string[] } = source.system.traits;
            const actorTraits: { value: string[] } = actorSource?.system.traits ?? { value: [] };

            traits.value = R.compact(
                traits.value.map((t) => (this.#ALIGNMENT_VERSATILE_TRAITS.includes(t) ? "versatile-spirit" : t)),
            );
            if (traits.value.some((t) => t === "good")) {
                traits.value.push("holy");
                actorTraits.value.push("holy");
            } else if (traits.value.some((t) => t === "evil")) {
                traits.value.push("unholy");
                actorTraits.value.push("unholy");
            }

            const partials: Record<string, NPCAttackDamageSource | null> = source.system.damageRolls;
            for (const [key, partial] of Object.entries(partials)) {
                if (!isObject(partial)) continue;

                const damageType: string = partial.damageType;
                if (["chaotic", "lawful"].includes(damageType)) {
                    partial.damageType = "spirit";
                } else if (damageType === "good") {
                    actorTraits.value.push("holy");
                    if (/^\d+$/.test(partial.damage)) {
                        partials[`-=${key}`] = null;
                    } else {
                        partial.damageType = "spirit";
                    }
                } else if (damageType === "evil") {
                    traits.value.push("unholy");
                    if (/^\d+$/.test(partial.damage)) {
                        partials["-=${key}"] = null;
                    } else {
                        partial.damageType = "spirit";
                    }
                }
            }

            traits.value = R.uniq(traits.value.sort());
            actorTraits.value = R.uniq(actorTraits.value.sort());
        } else if (source.type === "spell") {
            const damage: { type: string }[] = Object.values(source.system.damage).filter(
                (d) => isObject(d) && typeof d.type === "string",
            );
            const traits: { value: string[] } = source.system.traits;

            for (const partial of damage) {
                const damageType = partial.type;
                if (this.#ALIGNMENT_DAMAGE_TYPES.includes(damageType)) {
                    partial.type = "spirit";
                }
                if (damageType === "good") {
                    traits.value.push("holy");
                } else if (damageType === "evil") {
                    traits.value.push("unholy");
                }
            }

            traits.value = R.uniq(traits.value.sort());
        }

        const { description } = source.system;
        if (actorSource?.type === "npc" && source.type === "action" && source.system.actionType.value !== "passive") {
            const hasGoodInlineRoll = /\[good\b/.test(description.value) || /\bgood\]/.test(description.value);
            const hasEvilInlineRoll = /\[evil\b/.test(description.value) || /\bevil\]/.test(description.value);

            if (hasGoodInlineRoll && actorSource.system.traits.value.includes("holy")) {
                source.system.traits.value.push("holy");
            } else if (hasEvilInlineRoll && actorSource.system.traits.value.includes("unholy")) {
                source.system.traits.value.push("unholy");
            }
            source.system.traits.value = R.uniq(source.system.traits.value.sort());
        }

        description.value = description.value
            .replace(/\[(?:good|evil|lawful|chaotic)\b/g, "[spirit")
            .replace(/\b(?:good|evil|lawful|chaotic)\]/g, "spirit]")
            .replace(/\b(\dd\d) (?:good|evil|lawful|chaotic)\b/g, "$1 spirit")
            .replace(/\b(?:Good|Evil|Lawful|Chaotic) Damage\b/g, "Spirit Damage")
            .replace(/(?<!(?:nd|or) )\b(?:good|evil|lawful|chaotic) damage\b/g, "spirit damage");
    }
}

interface WeaklyTypedIWR {
    immunities?: { type: string; exceptions?: (string | object)[] }[];
    weaknesses?: { type: string; exceptions?: (string | object)[] }[];
    resistances?: { type: string; exceptions?: (string | object)[]; doubleVs?: (string | object)[] }[];
}
