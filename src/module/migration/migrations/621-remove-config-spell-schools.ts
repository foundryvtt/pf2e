import { ItemSourcePF2e } from "@item/data/index.ts";
import { MAGIC_SCHOOLS } from "@item/spell/values.ts";
import { objectHasKey, setHasElement } from "@util";
import { MigrationBase } from "../base.ts";
import { MagicSchool, SpellSystemSource } from "@item/spell/index.ts";

/** Remove duplicate magic schools localization map */
export class Migration621RemoveConfigSpellSchools extends MigrationBase {
    static override version = 0.621;

    private KEY_MAP = {
        abj: "abjuration",
        con: "conjuration",
        div: "divination",
        enc: "enchantment",
        evo: "evocation",
        ill: "illusion",
        nec: "necromancy",
        trs: "transmutation",
    } as const;

    private reassignSchool(abbreviation: string) {
        if (objectHasKey(this.KEY_MAP, abbreviation)) {
            return this.KEY_MAP[abbreviation];
        } else if (setHasElement(MAGIC_SCHOOLS, abbreviation)) {
            return abbreviation;
        } else {
            return this.KEY_MAP.evo;
        }
    }

    override async updateItem(itemData: ItemSourcePF2e): Promise<void> {
        if (itemData.type === "spell") {
            const system: SpellSystemSourceWithSchool = itemData.system;
            const school: { value: string } = system.school ?? { value: "evocation" };
            school.value = this.reassignSchool(school.value);
        }
    }
}

interface SpellSystemSourceWithSchool extends SpellSystemSource {
    school?: { value: MagicSchool };
}
