import { ItemSourcePF2e } from "@item/data/index.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { PredicateStatement, RawPredicate } from "@system/predication.ts";
import { isObject } from "@util";
import { MigrationBase } from "../base.ts";

/** Convert predicate properties of rule elements to arrays  */
export class Migration793MakePredicatesArrays extends MigrationBase {
    static override version = 0.793;

    #convertLegacyData(predicate: OldRawPredicate): RawPredicate {
        const keys = Object.keys(predicate);
        if (keys.length === 0) return [];
        if (keys.length === 1 && Array.isArray(predicate.all)) {
            return deepClone(predicate.all);
        }
        if (keys.length === 1 && Array.isArray(predicate.any) && predicate.any.length === 1) {
            return deepClone(predicate.any);
        }

        return deepClone(
            [
                predicate.all ?? [],
                Array.isArray(predicate.any) ? { or: predicate.any } : [],
                Array.isArray(predicate.not)
                    ? predicate.not.length === 1
                        ? { not: predicate.not[0]! }
                        : { nor: predicate.not }
                    : [],
            ].flat()
        );
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const rules: MaybeWithOldPredicates[] = source.system.rules;
        for (const rule of rules) {
            if (this.#isOldRawPredicate(rule.predicate)) {
                rule.predicate = this.#convertLegacyData(rule.predicate);
            }

            if (this.#isOldRawPredicate(rule.definition)) {
                rule.definition = this.#convertLegacyData(rule.definition);
            }

            if (this.#isOldRawPredicate(rule.allowedDrops)) {
                rule.allowedDrops = {
                    label: rule.allowedDrops.label ?? undefined,
                    predicate: this.#convertLegacyData(rule.allowedDrops),
                };
            }

            if (this.#isOldRawPredicate(rule.predicate)) {
                rule.predicate = this.#convertLegacyData(rule.predicate);
            }

            if (this.#isArrayChoiceSet(rule)) {
                for (const choice of rule.choices) {
                    if (this.#isOldRawPredicate(choice.predicate)) {
                        choice.predicate = this.#convertLegacyData(choice.predicate);
                    }
                }
            } else if (this.#isObjectChoiceSet(rule)) {
                if (this.#isOldRawPredicate(rule.choices.predicate)) {
                    rule.choices.predicate = this.#convertLegacyData(rule.choices.predicate);
                }
                if (this.#isOldRawPredicate(rule.choices.postFilter)) {
                    rule.choices.postFilter = this.#convertLegacyData(rule.choices.postFilter);
                }
            } else if (this.#isOldRawPredicate(rule.craftableItems)) {
                rule.craftableItems = this.#convertLegacyData(rule.craftableItems);
            }
            if (this.#isOldRawPredicate(rule.disabledIf)) {
                rule.disabledIf = this.#convertLegacyData(rule.disabledIf);
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
