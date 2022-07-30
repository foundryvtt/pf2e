import { ItemSourcePF2e } from "@item/data";
import { RuleElementSource } from "@module/rules";
import { MigrationBase } from "../base";

/** Exclude the Universalist wizard feature from receiving an initial focus pool */
export class Migration769NoUniversalistFocusPool extends MigrationBase {
    static override version = 0.769;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "feat" && source.data.slug === "arcane-school") {
            const rule = source.data.rules.find(
                (r: RuleElementSource & { path?: unknown }) =>
                    r.key === "ActiveEffectLike" && r.path === "data.resources.focus.max"
            );
            if (rule) {
                rule.predicate = { not: ["feature:universalist"] };
            }
        }
    }
}
