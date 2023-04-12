import { MigrationBase } from "../base.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";

/** Remove "instinct" trait from feats */
export class Migration615RemoveInstinctTrait extends MigrationBase {
    static override version = 0.615;

    override async updateItem(itemData: ItemSourcePF2e): Promise<void> {
        const traits: { value?: string[] } | undefined = itemData.system.traits;
        if (!traits) return;
        if (typeof traits.value === "string") {
            // Catch trait.value properties that missed migration 597
            traits.value = [];
        } else {
            traits.value = traits.value?.filter((trait) => trait !== "instinct");
        }
    }
}
