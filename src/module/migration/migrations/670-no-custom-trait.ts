import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Remove the "custom" trait that snuck into item traits */
export class Migration670NoCustomTrait extends MigrationBase {
    static override version = 0.67;

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        const traits: { value?: string[] } | undefined = itemSource.system.traits;
        if (!traits) return;
        if (Array.isArray(traits.value)) {
            traits.value = traits.value.filter((trait) => trait && trait !== "custom");
        } else {
            traits.value = [];
        }
    }
}
