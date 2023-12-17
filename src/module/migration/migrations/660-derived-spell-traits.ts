import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MAGIC_TRADITIONS } from "@item/spell/values.ts";
import { MigrationBase } from "../base.ts";

/** Remove manually set magic school and tradition traits from spells */
export class Migration660DerivedSpellTraits extends MigrationBase {
    static override version = 0.66;

    #MAGIC_SCHOOLS = new Set([
        "abjuration",
        "conjuration",
        "divination",
        "enchantment",
        "evocation",
        "illusion",
        "necromancy",
        "transmutation",
    ]);

    #derivedTraits: string[] = [...this.#MAGIC_SCHOOLS, ...MAGIC_TRADITIONS];

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "spell") {
            const traits: { value: string[] } = source.system.traits;
            traits.value = traits.value.filter((trait) => !this.#derivedTraits.includes(trait));
        }
    }
}
