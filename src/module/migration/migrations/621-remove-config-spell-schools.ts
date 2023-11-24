import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { SpellSystemSource } from "@item/spell/index.ts";
import { objectHasKey } from "@util";
import { MigrationBase } from "../base.ts";

/** Remove duplicate magic schools localization map */
export class Migration621RemoveConfigSpellSchools extends MigrationBase {
    static override version = 0.621;

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

    #KEY_MAP = {
        abj: "abjuration",
        con: "conjuration",
        div: "divination",
        enc: "enchantment",
        evo: "evocation",
        ill: "illusion",
        nec: "necromancy",
        trs: "transmutation",
    } as const;

    #reassignSchool(abbreviation: string) {
        if (objectHasKey(this.#KEY_MAP, abbreviation)) {
            return this.#KEY_MAP[abbreviation];
        } else if (this.#MAGIC_SCHOOLS.has(abbreviation)) {
            return abbreviation;
        } else {
            return this.#KEY_MAP.evo;
        }
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "spell") {
            const system: SpellSystemSourceWithSchool = source.system;
            const school: { value: string } = system.school ?? { value: "evocation" };
            school.value = this.#reassignSchool(school.value);
        }
    }
}

interface SpellSystemSourceWithSchool extends SpellSystemSource {
    school?: { value: string };
}
