import { FeatSource, ItemSourcePF2e } from "@item/data/index.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { PredicateStatement } from "@system/predication.ts";
import { isObject } from "@util";
import { MigrationBase } from "../base.ts";

/** Update features that require agile, finesse or ranged weapons to reflect current melee/ranged classification */
export class Migration775AgileFinesseRanged extends MigrationBase {
    static override version = 0.775;

    #findDamageDiceRE(source: ItemSourcePF2e): RuleElementSource | null {
        return source.system.rules.find((r) => r.key === "DamageDice") ?? null;
    }

    #isClassFeature(source: ItemSourcePF2e): source is FeatSource & { system: { featType: "classfeature" } } {
        return (
            source.type === "feat" &&
            "featType" in source.system &&
            isObject<{ value: string }>(source.system.featType) &&
            source.system.featType.value === "classfeature"
        );
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        switch (source.type) {
            case "action": {
                if (source.system.slug === "sneak-attack") {
                    const damageDiceRE = this.#findDamageDiceRE(source);
                    // Skip NPCs with PFS's simplified sneak attack rule
                    if (
                        isObject<{ predicate: OldRawPredicate }>(damageDiceRE) &&
                        damageDiceRE.predicate &&
                        Array.isArray(damageDiceRE.predicate.all) &&
                        damageDiceRE.predicate.all.some((s) => s instanceof Object && "or" in s)
                    ) {
                        damageDiceRE.predicate = this.#sneakAttackPredicate;
                    }
                }
                break;
            }
            case "feat": {
                switch (source.system.slug) {
                    case "athletic-strategist": {
                        const index = source.system.rules.findIndex((r) => r.key === "FlatModifier");
                        if (index !== -1) {
                            source.system.rules[index] = this.#athleticStrategist;
                        }
                        break;
                    }
                    case "devise-a-stratagem": {
                        const index = source.system.rules.findIndex((r) => r.key === "FlatModifier");
                        if (index !== -1) {
                            source.system.rules[index] = this.#deviseAStratagem;
                        }

                        break;
                    }
                    case "ruffian": {
                        const damageDiceRE = this.#findDamageDiceRE(source);
                        if (damageDiceRE) {
                            damageDiceRE.predicate = this.#ruffianPredicate;
                        }
                        break;
                    }
                    case "shadow-sneak-attack":
                    case "sneak-attack":
                    case "sneak-attacker": {
                        const damageDiceRE = this.#findDamageDiceRE(source);
                        if (damageDiceRE) {
                            const predicate = this.#sneakAttackPredicate;
                            if (this.#isClassFeature(source)) {
                                predicate.all?.unshift("class:rogue");
                            }
                            damageDiceRE.predicate = predicate;
                        }
                        break;
                    }
                }
            }
        }
    }

    get #athleticStrategist(): BaseREWithOtherStuff {
        return {
            ability: "int",
            key: "FlatModifier",
            predicate: {
                all: [
                    "class:investigator",
                    "devise-a-stratagem",
                    { or: ["action:disarm", "action:grapple", "action:shove", "action:trip"] },
                ],
                any: [
                    "weapon:trait:agile",
                    "weapon:trait:finesse",
                    { and: ["weapon:ranged", { not: "weapon:thrown-melee" }] },
                    "weapon:base:sap",
                ],
            },
            selector: "athletics",
            type: "ability",
        };
    }

    get #deviseAStratagem(): BaseREWithOtherStuff {
        return {
            ability: "int",
            key: "FlatModifier",
            predicate: {
                all: ["class:investigator", "devise-a-stratagem"],
                any: [
                    "weapon:trait:agile",
                    "weapon:trait:finesse",
                    { and: ["weapon:ranged", { not: "weapon:thrown-melee" }] },
                    "weapon:base:sap",
                ],
            },
            selector: "attack-roll",
            type: "ability",
        };
    }

    get #ruffianPredicate(): OldRawPredicate {
        return {
            all: [
                "target:condition:flat-footed",
                "weapon:category:simple",
                {
                    nor: [
                        { and: ["weapon:ranged", { not: "weapon:thrown-melee" }] },
                        "weapon:trait:agile",
                        "weapon:trait:finesse",
                    ],
                },
            ],
        };
    }

    get #sneakAttackPredicate(): OldRawPredicate {
        return {
            all: ["target:condition:flat-footed"],
            any: [
                "weapon:trait:agile",
                "weapon:trait:finesse",
                { and: ["weapon:ranged", { not: "weapon:thrown-melee" }] },
            ],
        };
    }
}

type BaseREWithOtherStuff = RuleElementSource & Record<string, unknown>;

interface OldRawPredicate {
    all?: PredicateStatement[];
    any?: PredicateStatement[];
    not?: PredicateStatement[];
}
