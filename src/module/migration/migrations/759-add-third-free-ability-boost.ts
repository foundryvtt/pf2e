import { AbilityString } from "@actor/data/base";
import { ItemSourcePF2e } from "@item/data";
import { sluggify } from "@util";
import { MigrationBase } from "../base";

/** Add third free ability boost to Amnesiac and Discarded Duplicate backgrounds */
export class Migration759AddThirdFreeAbilityBoost extends MigrationBase {
    static override version = 0.759;

    private get freeAbilityBoost(): AbilityString[] {
        return ["cha", "con", "dex", "int", "str", "wis"];
    }

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if (itemSource.type !== "background") return;

        const slug = itemSource.data.slug ?? sluggify(itemSource.name);

        if (!["amnesiac", "discarded-duplicate"].includes(slug)) return;

        if (Object.keys(itemSource.data.boosts).length < 3) {
            itemSource.data.boosts = {
                "0": {
                    value: this.freeAbilityBoost,
                },
                "1": {
                    value: this.freeAbilityBoost,
                },
                "2": {
                    value: this.freeAbilityBoost,
                },
            };
        }
    }
}
