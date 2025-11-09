import { ActorDetailsSource } from "@actor/data/base.ts";
import { ActorSourcePF2e } from "@actor/data/index.ts";
import { AttributeString } from "@actor/types.ts";
import { ATTRIBUTE_ABBREVIATIONS } from "@actor/values.ts";
import { ItemSourcePF2e, MeleeSource } from "@item/base/data/index.ts";
import { DeitySystemSource } from "@item/deity/data.ts";
import { Sanctification } from "@item/deity/types.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { setHasElement } from "@util";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/**
 * Remove actor alignment data, generating invalid alignment traits to be surfaced by a module.
 * Also convert deity alignments to sanctifications
 */
export class Migration883BanishAlignment extends MigrationBase {
    static override version = 0.883;

    #ALIGNMENTS = ["good", "evil", "lawful", "chaotic"];

    #migrateRule(
        rule: DeepPartial<RuleElementSource> & { key: string },
    ): (DeepPartial<RuleElementSource> & { key: string }) | never[] {
        // Remove school traits from aura REs
        if ("traits" in rule && Array.isArray(rule.traits)) {
            rule.traits = rule.traits.filter((t) => !this.#ALIGNMENTS.includes(t));
        }
        if (Array.isArray(rule.predicate)) {
            rule.predicate = rule.predicate.filter((s) => !this.#ALIGNMENTS.includes(s));
        }
        return rule;
    }

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        const details: MaybeWithAlignment = source.system.details;
        if (R.isPlainObject(details.alignment) && typeof details.alignment.value === "string") {
            const traits: { value: string[] } = source.system.traits ?? { value: [] };
            switch (details.alignment.value) {
                case "LG":
                    traits.value.push("lawful", "good");
                    break;
                case "NG":
                    traits.value.push("good");
                    break;
                case "CG":
                    traits.value.push("chaotic", "good");
                    break;
                case "LE":
                    traits.value.push("lawful", "evil");
                    break;
                case "NE":
                    traits.value.push("evil");
                    break;
                case "CE":
                    traits.value.push("chaotic", "evil");
                    break;
                case "LN":
                    traits.value.push("lawful");
                    break;
                case "CN":
                    traits.value.push("chaotic");
                    break;
            }

            // Add "holy" and "unholy" traits for safe bets
            if (source.type === "npc") {
                if (traits.value.includes("celestial") && traits.value.includes("good")) {
                    traits.value.push("holy");
                    for (const item of source.items.filter((i): i is MeleeSource => i.type === "melee")) {
                        if (!item.system.traits.value.includes("holy")) {
                            item.system.traits.value.push("holy");
                            item.system.traits.value.sort();
                        }
                    }
                } else if (
                    ["fiend", "rakshasa", "undead"].some((t) => traits.value.includes(t)) &&
                    traits.value.includes("evil")
                ) {
                    traits.value.push("unholy");
                    if (traits.value.includes("fiend") || traits.value.includes("rakshasa")) {
                        for (const item of source.items.filter((i): i is MeleeSource => i.type === "melee")) {
                            if (!item.system.traits.value.includes("unholy")) {
                                item.system.traits.value.push("unholy");
                                item.system.traits.value.sort();
                            }
                        }
                    }
                }
            }

            traits.value = R.unique(traits.value.sort());
        }

        if ("alignment" in details) {
            details["-=alignment"] = null;
        }
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system.rules = source.system.rules.flatMap((r) => this.#migrateRule(r));

        if (source.type === "deity") {
            const system: MaybeOldDeitySystemSource = source.system;
            if ("alignment" in system) {
                const { alignment } = system;
                if (R.isPlainObject(alignment) && "follower" in alignment && Array.isArray(alignment.follower)) {
                    const followers = alignment.follower.filter((a): a is string => typeof a === "string");
                    const modal =
                        system.category === "philosophy"
                            ? null
                            : ["asmodeus", "iomedae", "rovagug", "urgathoa"].includes(system.slug ?? "")
                              ? "must"
                              : "can";
                    const what: Sanctification[] | null =
                        modal === null || system.slug === "pharasma"
                            ? null
                            : system.slug === "gorum"
                              ? ["holy", "unholy"]
                              : followers.some((f) => f.includes("G"))
                                ? followers.some((f) => f.includes("E"))
                                    ? ["holy", "unholy"]
                                    : ["holy"]
                                : followers.some((f) => f.includes("E"))
                                  ? ["unholy"]
                                  : null;
                    system.sanctification = modal === null || what === null ? null : { modal, what };
                }
                system["-=alignment"] = null;
            }

            if ("ability" in system) {
                system.attribute = Array.isArray(system.ability)
                    ? R.unique(
                          system.ability
                              .filter((a): a is AttributeString => setHasElement(ATTRIBUTE_ABBREVIATIONS, a))
                              .sort(),
                      )
                    : [];
                system["-=ability"] = null;
            }
        } else if (
            source.type === "feat" &&
            ["the-tenets-of-evil", "the-tenets-of-good"].includes(source.system.slug ?? "")
        ) {
            const rule = {
                key: "ActorTraits",
                add: source.system.slug === "the-tenets-of-good" ? ["holy"] : ["unholy"],
            };
            source.system.rules = [rule];
        }
    }
}

interface MaybeWithAlignment extends ActorDetailsSource {
    alignment?: unknown;
    "-=alignment"?: null;
}

type MaybeOldDeitySystemSource = DeitySystemSource & {
    "-=ability"?: null;
    "-=alignment"?: null;
};
