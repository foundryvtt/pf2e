import type { ActorSourcePF2e } from "@actor/data/index.ts";
import type { ItemSourcePF2e } from "@item/base/data/index.ts";
import type { NPCAttackDamage } from "@item/melee/data.ts";
import type { SpellSystemSource } from "@item/spell/data.ts";
import type { RuleElementSource } from "@module/rules/index.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/** Replace all alignment damage and IWR with spirit damage and/or the holy trait */
export class Migration885ConvertAlignmentDamage extends MigrationBase {
    static override version = 0.885;

    #ALIGNMENTS = new Set(["good", "evil", "lawful", "chaotic"]);

    #ALIGNMENT_VERSATILE_TRAITS = Array.from(this.#ALIGNMENTS).map((dt) => `versatile-${dt}`);

    #migrateRule(rule: RuleElementSource): RuleElementSource | never[] {
        if ("type" in rule) {
            if (rule.key === "Immunity" && typeof rule.type === "string" && this.#ALIGNMENTS.has(rule.type)) {
                return [];
            } else if (["Weakness", "Resistance"].includes(String(rule.key)) && typeof rule.type === "string") {
                if (["lawful", "chaotic"].includes(rule.type)) return [];
                if (Array.isArray(rule.predicate)) {
                    rule.predicate = rule.predicate.filter(
                        (s) => typeof s !== "string" || !/^self:trait:(?:good|evil|lawful|chaotic)$/.test(s),
                    );
                }
                if (rule.type === "good") rule.type = "holy";
                if (rule.type === "evil") rule.type = "unholy";
            } else if (Array.isArray(rule.type)) {
                rule.type = rule.type.flatMap((t) =>
                    ["lawful", "chaotic"].includes(t) ? [] : t === "good" ? "holy" : t === "evil" ? "unholy" : t,
                );
            }
        }

        if ("deactivatedBy" in rule && Array.isArray(rule.deactivatedBy)) {
            rule.deactivatedBy = rule.deactivatedBy.flatMap((db) =>
                ["lawful", "chaotic"].includes(db) ? [] : db === "good" ? "holy" : db === "evil" ? "unholy" : db,
            );
        }

        if ("damageType" in rule && typeof rule.damageType === "string") {
            rule.damageType = this.#ALIGNMENTS.has(rule.damageType) ? "spirit" : rule.damageType;
        }

        return rule;
    }

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        const traits: { value: string[] } =
            source.type === "character" ? { value: [] } : (source.system.traits ?? { value: [] });

        const iwrKeys = ["immunities", "weaknesses", "resistances"] as const;
        const iwr: WeaklyTypedIWR = R.pick(
            source.system.attributes ?? { immunities: undefined, weaknesses: undefined, resistances: undefined },
            iwrKeys,
        );

        for (const key of iwrKeys) {
            iwr[key] = iwr[key]?.filter((i) => !["chaotic", "lawful"].includes(i.type));
            for (const obj of [...(iwr[key] ?? [])]) {
                obj.type = obj.type.replace("good", "holy").replace("evil", "unholy");
                obj.exceptions = obj.exceptions
                    ?.filter((e) => R.isPlainObject(e) || (typeof e === "string" && !["chaotic", "lawful"].includes(e)))
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

        source.system.attributes &&= fu.mergeObject(source.system.attributes, iwr);
        traits.value = R.unique(traits.value.sort());
        if (traits.value.includes("holy") && traits.value.includes("unholy")) {
            // Something weird about this one!
            traits.value = traits.value.filter((t) => !["holy", "unholy"].includes(t));
        }
    }

    override async updateItem(source: ItemSourcePF2e, actorSource?: ActorSourcePF2e): Promise<void> {
        source.system.rules = source.system.rules.flatMap((r) => this.#migrateRule(r));

        if (source.type === "weapon") {
            const traits: { value: string[] } = source.system.traits;
            traits.value = traits.value
                .map((t) => (this.#ALIGNMENT_VERSATILE_TRAITS.includes(t) ? "versatile-spirit" : t))
                .filter(R.isTruthy);
            if (this.#ALIGNMENTS.has(source.system.damage.damageType)) {
                source.system.damage.damageType = "spirit";
            }
            traits.value = traits.value.map((t) =>
                t === "sanctified" ? (traits.value.includes("good") ? "holy" : "unholy") : t,
            );
            traits.value = R.unique(traits.value.sort());
        } else if (source.type === "melee") {
            const traits: { value: string[] } = source.system.traits;
            const actorTraits: { value: string[] } = actorSource?.system.traits ?? { value: [] };

            traits.value = traits.value
                .map((t) => (this.#ALIGNMENT_VERSATILE_TRAITS.includes(t) ? "versatile-spirit" : t))
                .filter(R.isTruthy);
            if (traits.value.some((t) => t === "good")) {
                traits.value.push("holy");
                actorTraits.value.push("holy");
            } else if (traits.value.some((t) => t === "evil")) {
                traits.value.push("unholy");
                actorTraits.value.push("unholy");
            }

            const partials: Record<string, NPCAttackDamage | null> = source.system.damageRolls;
            for (const [key, partial] of Object.entries(partials)) {
                if (!R.isPlainObject(partial)) continue;
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
                        partials[`-=${key}`] = null;
                    } else {
                        partial.damageType = "spirit";
                    }
                }
            }

            traits.value = R.unique(traits.value.sort());
            actorTraits.value = R.unique(actorTraits.value.sort());
        } else if (source.type === "spell") {
            const damage: { type: string }[] = Object.values(source.system.damage).filter(
                (d) => R.isPlainObject(d) && typeof d.type === "string",
            );
            const traits: { value: string[] } = source.system.traits;

            for (const partial of damage) {
                const damageType = partial.type;
                if (this.#ALIGNMENTS.has(damageType)) {
                    partial.type = "spirit";
                }
                if (damageType === "good") {
                    traits.value.push("holy");
                } else if (damageType === "evil") {
                    traits.value.push("unholy");
                }
            }
            traits.value = R.unique(traits.value.sort());
            if (source.system.slug === "divine-decree") {
                // Special case for Divine Decree spell
                const system: Pick<SpellSystemSource, "damage"> & { "-=overlays"?: null } = source.system;
                const damage = Object.values(system.damage).shift();
                if (R.isPlainObject(damage)) damage.type = "spirit";
                system["-=overlays"] = null;
            } else {
                // Let's play this one safe
                try {
                    const overlayPartials = Object.values(source.system.overlays ?? {})
                        .filter((o) => R.isPlainObject(o) && o.overlayType === "override")
                        .map((o) => (o.system ??= {})?.damage)
                        .flatMap((p) => (R.isPlainObject(p) ? Object.values(p) : []))
                        .flat()
                        .filter(R.isTruthy);
                    for (const partial of overlayPartials) {
                        if (this.#ALIGNMENTS.has(partial.type ?? "")) {
                            partial.type = "spirit";
                        }
                    }
                } catch (error) {
                    if (error instanceof Error) console.error(error.message);
                }
            }
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
            source.system.traits.value = R.unique(source.system.traits.value.sort());
        }

        description.value = description.value
            .replace(/\[(?:good|evil|lawful|chaotic)\b/g, "[spirit")
            .replace(/\b(?:good|evil|lawful|chaotic)\]/g, "spirit]")
            .replace(/\b(\dd\d) (?:good|evil|lawful|chaotic)\b/g, "$1 spirit");
    }
}

interface WeaklyTypedIWR {
    immunities?: { type: string; exceptions?: (string | object)[] }[];
    weaknesses?: { type: string; exceptions?: (string | object)[] }[];
    resistances?: { type: string; exceptions?: (string | object)[]; doubleVs?: (string | object)[] }[];
}
