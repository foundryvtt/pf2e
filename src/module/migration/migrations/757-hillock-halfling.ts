import { ItemSourcePF2e } from "@item/data";
import { RuleElementSource } from "@module/rules";
import { sluggify } from "@util";
import { MigrationBase } from "../base";

/** Add recovery bonus to Hillock Halfling heritage */
export class Migration757HillockHalfling extends MigrationBase {
    static override version = 0.757;

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if (itemSource.type !== "heritage") return;

        const slug = itemSource.data.slug ?? sluggify(itemSource.name);

        if (slug !== "hillock-halfling") return;

        const rules = itemSource.data.rules;
        const needsRuleElement = !rules.some(
            (rule: Record<string, unknown>) => "path" in rule && rule["path"] === "data.attributes.hp.recoveryAddend"
        );

        if (needsRuleElement) {
            const element: AELikeSource = {
                key: "ActiveEffectLike",
                mode: "add",
                path: "data.attributes.hp.recoveryAddend",
                value: "@actor.level",
            };
            rules.push(element);
        }
    }
}

interface AELikeSource extends RuleElementSource {
    mode: string;
    path: string;
}
