import { ItemSourcePF2e } from "@item/data";
import { SpellSystemData } from "@item/spell/data";
import { MagicSchool } from "@item/spell/types";
import { MigrationBase } from "../base";

/** More dual school spells got printed... */
export class Migration767SchoolIntoTraits extends MigrationBase {
    static override version = 0.767;
    override async updateItem(item: ItemSourcePF2e) {
        if (item.type !== "spell" && item.type !== "consumable") return;
        const system: SpellSystemOld | undefined = item.type === "spell" ? item.data : item.data.spell.data?.data;
        if (!system) return;

        if (system.school) {
            if (system.school.value) {
                system.traits.value.push(system.school.value);
            }

            delete system.school;
            system["-=school"] = null;
        }
    }
}

interface SpellSystemOld extends SpellSystemData {
    school?: {
        value: MagicSchool;
    };
    "-=school"?: null;
}
