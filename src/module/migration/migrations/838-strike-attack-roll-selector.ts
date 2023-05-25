import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Replace all instances of "mundane-attack" selector with "strike-attack-roll" */
export class Migration838StrikeAttackRollSelector extends MigrationBase {
    static override version = 0.838;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        // Sanity check
        if (!Array.isArray(source.system.rules)) {
            source.system.rules = [];
        }

        for (const rule of source.system.rules) {
            if (!("selector" in rule)) continue;

            if (rule.selector === "mundane-attack") {
                rule.selector = "strike-attack-roll";
            } else if (Array.isArray(rule.selector)) {
                rule.selector = rule.selector.map((s: string) => (s === "mundane-attack" ? "strike-attack-roll" : s));
            }
        }
    }
}
