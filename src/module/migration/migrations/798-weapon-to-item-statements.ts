import { ItemSourcePF2e } from "@item/data";
import { RuleElementSource } from "@module/rules";
import { RawPredicate } from "@system/predication";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base";

/** Change all "weapon:*" predication statements to "item:*" ones  */
export class Migration798WeaponToItemStatements extends MigrationBase {
    static override version = 0.798;
    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const rules: RESource[] = source.system.rules;
        for (const rule of rules) {
            for (const property of ["predicate", "definition"] as const) {
                const predicate = rule[property];
                if (Array.isArray(predicate)) {
                    rule[property] = recursiveReplaceString(predicate, (s) => s.replace(/^weapon:/, "item:"));
                }
            }
        }
    }
}

interface RESource extends RuleElementSource {
    definition?: RawPredicate;
}
