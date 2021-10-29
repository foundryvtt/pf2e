import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

/** Remove the "custom" trait that snuck into item traits */
export class Migration670NoCustomTrait extends MigrationBase {
    static override version = 0.67;

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        const traits: { value: string[] } | undefined = itemSource.data.traits;
        if (traits) {
            if (!Array.isArray(traits.value)) traits.value = [];
            traits.value = traits.value.filter((trait) => trait && trait !== "custom");
        }
    }
}
