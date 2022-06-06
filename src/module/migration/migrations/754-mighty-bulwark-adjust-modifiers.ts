import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

/** Add Adjust Modifier REs to Mighty Bulwark to suppress dexterity and standard bulwark modifiers */
export class Migration754MightyBulwarkAdjustModifiers extends MigrationBase {
    static override version = 0.754;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (!(source.type === "feat" && source.data.slug === "mighty-bulwark")) {
            return;
        }

        const newRules = [
            {
                key: "FlatModifier",
                predicate: { all: ["self:armor:trait:bulwark"] },
                selector: "reflex",
                type: "untyped",
                value: 4,
            },
            {
                key: "AdjustModifier",
                predicate: { all: ["self:armor:trait:bulwark"] },
                selector: "reflex",
                slug: "dex",
                suppress: true,
            },
            {
                key: "AdjustModifier",
                selector: "reflex",
                slug: "bulwark",
                suppress: true,
            },
        ];

        source.data.rules = newRules;
    }
}
