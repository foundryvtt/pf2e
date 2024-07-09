import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { SpellSystemSource } from "@item/spell/index.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

// Spell schools are gone as of remaster and rage of elements. Convert to trait for old spells
export class Migration846SpellSchoolOptional extends MigrationBase {
    static override version = 0.846;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "spell") return;

        const system: SpellSystemSourceWithSchool = source.system;
        if (system.school) {
            const traits: { value: string[] } = system.traits;
            traits.value = R.unique([...source.system.traits.value, system.school.value]).filter(R.isTruthy);
            system["-=school"] = null;
            delete system.school;
        }
    }
}

interface SpellSystemSourceWithSchool extends SpellSystemSource {
    school?: { value: string };
    "-=school"?: null;
}
