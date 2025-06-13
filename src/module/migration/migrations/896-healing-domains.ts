import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Fix traits on spell variants */
export class Migration896HealingDomains extends MigrationBase {
    static override version = 0.896;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (!["effect", "feat"].includes(source.type)) return;

        switch (source.system.slug) {
            case "harming-hands":
            case "healing-hands": {
                const rule = {
                    key: "DamageDice",
                    override: { dieSize: "d10" },
                    predicate: [source.system.slug === "healing-hands" ? "item:slug:heal" : "item:slug:harm"],
                    selector: ["spell-damage", "spell-healing"],
                };
                source.system.rules = [rule];
                break;
            }
            case "effect-curse-of-outpouring-life": {
                const rule = source.system.rules.find(
                    (r): r is { key: string; selector?: unknown } => r.key === "DamageDice",
                );
                if (rule) rule.selector = "spell-healing";
            }
        }
    }
}
