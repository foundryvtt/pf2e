import { ItemSourcePF2e } from "@item/base/data/index.ts";
import type { AELikeSource } from "@module/rules/rule-element/ae-like.ts";
import { sluggify } from "@util";
import { MigrationBase } from "../base.ts";

/** Add recovery bonus to Hillock Halfling heritage */
export class Migration757HillockHalfling extends MigrationBase {
    static override version = 0.757;

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if (itemSource.type !== "heritage") return;

        const slug = itemSource.system.slug ?? sluggify(itemSource.name);

        if (slug !== "hillock-halfling") return;

        const rules = itemSource.system.rules;
        const needsRuleElement = !rules.some(
            (rule: Record<string, unknown>) => "path" in rule && rule["path"] === "system.attributes.hp.recoveryAddend",
        );

        if (needsRuleElement) {
            const element: AELikeSource = {
                key: "ActiveEffectLike",
                mode: "add",
                path: "system.attributes.hp.recoveryAddend",
                value: "@actor.level",
            };
            rules.push(element);
        }
    }
}
