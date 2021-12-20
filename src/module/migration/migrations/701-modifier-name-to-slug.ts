import { ItemSourcePF2e } from "@item/data";
import { RuleElementSource } from "@module/rules/rules-data-definitions";
import { sluggify } from "@util";
import { MigrationBase } from "../base";

/** Rename the `name` property on FlatModifier and DamageDice REs to `slug` to better represent its purpose */
export class Migration701ModifierNameToSlug extends MigrationBase {
    static override version = 0.701;

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        const rules: MaybeWithName[] = itemSource.data.rules.filter((r) =>
            ["FlatModifier", "DamageDice"].includes(r.key)
        );
        for (const rule of rules) {
            if (rule.name) {
                if (!rule.label) {
                    rule.label = rule.name;
                } else {
                    rule.slug = sluggify(rule.name);
                    if (rule.label === "Rage") rule.label = "PF2E.TraitRage";
                }
                delete rule.name;
            }
        }
    }
}

interface MaybeWithName extends RuleElementSource {
    name?: string;
}
