import { ItemSourcePF2e } from "@item/data";
import { RuleElementSource } from "@module/rules";
import { MigrationBase } from "../base";

/** Fix featType properties erroneously set to a non-existent "dedication" type */
export class Migration733ItemBonusFromEquipment extends MigrationBase {
    static override version = 0.733;

    slugs = new Set(["animal-skin", "stance-mountain-stance", "spell-effect-mage-armor"]);

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const rules: (RuleElementSource & { type?: string; fromEquipment?: boolean })[] = source.data.rules;
        const compendiumItem = typeof source.data.slug === "string" && this.slugs.has(source.data.slug);
        const homebrewItem = !compendiumItem && ["feat", "spell"].includes(source.type);
        if (!(compendiumItem || homebrewItem)) return;

        for (const rule of rules) {
            if (rule.key === "FlatModifier" && rule.type === "item") {
                rule.fromEquipment = false;
            }
        }
    }
}
