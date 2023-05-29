import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";
import { PredicatePF2e, RawPredicate } from "@system/predication.ts";

/** Ensure predicates are wrapped in ensures following stricter validation */
export class Migration840ArrayWrapPredicates extends MigrationBase {
    static override version = 0.84;

    #wrapPredicate(predicate: unknown): RawPredicate | undefined {
        if (Array.isArray(predicate)) return predicate;
        const arrayWrapped = [predicate];
        return predicate && PredicatePF2e.isValid(arrayWrapped) ? arrayWrapped : undefined;
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        for (const rule of source.system.rules) {
            if ("predicate" in rule) {
                rule.predicate = this.#wrapPredicate(rule.predicate);
            }
            if ("definition" in rule) {
                rule.definition = this.#wrapPredicate(rule.definition);
            }
        }
    }
}
