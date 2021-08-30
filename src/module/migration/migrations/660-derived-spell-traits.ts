import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";
import { MAGIC_SCHOOLS, MAGIC_TRADITIONS } from "@item/spell/data/values";

/** Remove manually set magic school and tradition traits from spells */
export class Migration660DerivedSpellTraits extends MigrationBase {
    static override version = 0.66;

    private derivedTraits: string[] = [...MAGIC_SCHOOLS, ...MAGIC_TRADITIONS];

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if (itemSource.type === "spell") {
            const traits: { value: string[] } = itemSource.data.traits;
            traits.value = traits.value.filter((trait) => !this.derivedTraits.includes(trait));
        }
    }
}
