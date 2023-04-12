import { ItemSourcePF2e } from "@item/data/index.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { MigrationBase } from "../base.ts";

/** Exclude the Universalist wizard feature from receiving an initial focus pool */
export class Migration769NoUniversalistFocusPool extends MigrationBase {
    static override version = 0.769;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "feat" && source.system.slug === "arcane-school") {
            const rule = source.system.rules.find(
                (r: RuleElementSource & { path?: unknown }) =>
                    r.key === "ActiveEffectLike" && r.path === "system.resources.focus.max"
            );
            if (rule) {
                rule.predicate = { not: ["feature:universalist"] };
            }
        }
    }
}
