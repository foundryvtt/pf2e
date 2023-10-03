import { ItemSourcePF2e } from "@item/data/index.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { PredicateStatement } from "@system/predication.ts";
import { sluggify } from "@util";
import { MigrationBase } from "../base.ts";

/** Convert `LinkedProficiency` rules elements to `MartialProficiency` ones, apply to gunslinger class */
export class Migration704MartialProficiencyRE extends MigrationBase {
    static override version = 0.704;

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        const rules: MaybeLinkedProficiency[] = itemSource.system.rules.filter(
            (r): r is MaybeLinkedProficiency => r.key === "LinkedProficiency"
        );
        for (const rule of rules) {
            rule.key = "MartialProficiency";
            rule.definition = rule.predicate;
            delete rule.predicate;
            if (
                typeof rule.slug === "string" &&
                itemSource.system.slug?.endsWith("-weapon-familiarity") &&
                !rule.label
            ) {
                const key = sluggify(rule.slug, { camel: "bactrian" });
                rule.label = `PF2E.SpecificRule.MartialProficiency.${key}`;
            }
        }

        if (itemSource.type === "class") {
            if (itemSource.system.slug === "gunslinger" && itemSource.system.rules.length === 0) {
                const gunslingerRules: (RuleElementSource & { definition?: object })[] = [
                    {
                        definition: {
                            all: ["weapon:category:simple"],
                            any: ["weapon:group:firearm", "weapon:tag:crossbow"],
                        },
                        key: "MartialProficiency",
                        label: "PF2E.SpecificRule.MartialProficiency.SimpleFirearmsCrossbows",
                        slug: "simple-firearms-crossbows",
                        value: 2,
                    },
                    {
                        definition: {
                            all: ["weapon:category:martial"],
                            any: ["weapon:group:firearm", "weapon:tag:crossbow"],
                        },
                        key: "MartialProficiency",
                        label: "PF2E.SpecificRule.MartialProficiency.MartialFirearmsCrossbows",
                        slug: "martial-firearms-crossbows",
                        value: 2,
                    },
                    {
                        definition: {
                            all: ["weapon:category:advanced"],
                            any: ["weapon:group:firearm", "weapon:tag:crossbow"],
                        },
                        key: "MartialProficiency",
                        label: "PF2E.SpecificRule.MartialProficiency.AdvancedFirearmsCrossbows",
                        slug: "advanced-firearms-crossbows",
                        value: 1,
                    },
                ];
                itemSource.system.rules = gunslingerRules;
            }
        }
    }
}

interface MaybeLinkedProficiency extends Omit<RuleElementSource, "predicate"> {
    predicate?: OldRawPredicate;
    definition?: OldRawPredicate;
    immutable?: boolean;
}

interface OldRawPredicate {
    all?: PredicateStatement[];
    any?: PredicateStatement[];
    not?: PredicateStatement[];
}
