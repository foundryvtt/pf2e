import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";
import { MagicSchool, SpellSystemSource } from "@item/spell/index.ts";
import * as R from "remeda";

// Spell schools are gone as of remaster and rage of elements. Convert to trait for old spells
export class Migration846SpellSchoolOptional extends MigrationBase {
    static override version = 0.846;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "spell") return;

        const system: SpellSystemSourceWithSchool = source.system;
        if (system.school) {
            source.system.traits.value = R.uniq(R.compact([...source.system.traits.value, system.school.value]));
            system["-=school"] = null;
            delete system.school;
        }
    }
}

interface SpellSystemSourceWithSchool extends SpellSystemSource {
    school?: { value: MagicSchool };
    "-=school"?: null;
}
