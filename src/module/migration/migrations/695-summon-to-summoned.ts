import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

/** Change the "summon" creature trait to "summoned", correctly set "summon" trait on npc/hazard actions */
export class Migration695SummonToSummoned extends MigrationBase {
    static override version = 0.695;

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        const traits: { value: string[]; custom?: string } | undefined = itemSource.data.traits;
        if (!traits) return;

        if (itemSource.type === "action") {
            traits.custom ??= "";
            if (traits.custom.toLowerCase() === "summon") {
                traits.custom = "";
                traits.value = Array.from(new Set([...traits.value, "summon"])).sort();
            }
        } else {
            const index = traits.value.indexOf("summon");
            if (index !== -1) traits.value[index] = "summoned";
        }
    }
}
