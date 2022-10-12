import { ItemSourcePF2e } from "@item/data";
import { RuleElementSource } from "@module/rules";
import { convertLegacyData, PredicateStatement, RawPredicate } from "@system/predication";
import { isObject } from "@util";
import { MigrationBase } from "../base";

/** Convert predicate properties of rule elements to arrays  */
export class Migration793MakePredicatesArrays extends MigrationBase {
    static override version = 0.793;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const rules: MaybeWithOldPredicates[] = source.system.rules;
        for (const rule of rules) {
            if (this.#isOldRawPredicate(rule.predicate)) {
                rule.predicate = convertLegacyData(rule.predicate);
            }

            if (this.#isOldRawPredicate(rule.definition)) {
                rule.definition = convertLegacyData(rule.definition);
            }

            if (this.#isOldRawPredicate(rule.allowedDrops)) {
                rule.allowedDrops = {
                    label: rule.allowedDrops.label ?? undefined,
                    predicate: convertLegacyData(rule.allowedDrops),
                };
            }

            if (this.#isOldRawPredicate(rule.predicate)) {
                rule.predicate = convertLegacyData(rule.predicate);
            }

            if (this.#isArrayChoiceSet(rule)) {
                for (const choice of rule.choices) {
                    if (this.#isOldRawPredicate(choice.predicate)) {
                        choice.predicate = convertLegacyData(choice.predicate);
                    }
                }
            } else if (this.#isObjectChoiceSet(rule)) {
                if (this.#isOldRawPredicate(rule.choices.predicate)) {
                    rule.choices.predicate = convertLegacyData(rule.choices.predicate);
                }
                if (this.#isOldRawPredicate(rule.choices.postFilter)) {
                    rule.choices.postFilter = convertLegacyData(rule.choices.postFilter);
                }
            } else if (this.#isOldRawPredicate(rule.craftableItems)) {
                rule.craftableItems = convertLegacyData(rule.craftableItems);
            }
            if (this.#isOldRawPredicate(rule.disabledIf)) {
                rule.disabledIf = convertLegacyData(rule.disabledIf);
            }
        }
    }

    #isOldRawPredicate(predicate: unknown): predicate is OldRawPredicate {
        if (!predicate || Array.isArray(predicate)) return false;
        if (isObject<{ predicate?: unknown }>(predicate) && Array.isArray(predicate["predicate"])) return false;
        return predicate instanceof Object;
    }

    #isArrayChoiceSet(rule: MaybeWithOldPredicates): rule is ArrayChoiceSet {
        return rule.key === "ChoiceSet" && Array.isArray(rule.choices);
    }

    #isObjectChoiceSet(rule: MaybeWithOldPredicates): rule is ObjectChoiceSet {
        return (
            rule.key === "ChoiceSet" && isObject<{ predicate?: unknown }>(rule.choices) && !Array.isArray(rule.choices)
        );
    }
}

interface MaybeWithOldPredicates extends RuleElementSource {
    definition?: unknown;
    allowedDrops?: unknown;
    disabledIf?: unknown;
    choices?: unknown;
    craftableItems?: unknown;
}

interface ArrayChoiceSet extends MaybeWithOldPredicates {
    choices: { predicate?: OldRawPredicate | RawPredicate }[];
}

interface ObjectChoiceSet extends MaybeWithOldPredicates {
    choices: {
        postFilter?: OldRawPredicate | RawPredicate;
        predicate?: OldRawPredicate | RawPredicate;
    };
}

interface OldRawPredicate {
    label?: unknown;
    all?: PredicateStatement[];
    any?: PredicateStatement[];
    not?: PredicateStatement[];
}
