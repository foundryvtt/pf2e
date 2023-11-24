import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { SpellSystemSource } from "@item/spell/data.ts";
import { isObject, tupleHasValue } from "@util";
import { MigrationBase } from "../base.ts";

export class Migration627LowerCaseSpellSaves extends MigrationBase {
    static override version = 0.627;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "spell") return;
        const system: SpellSystemSourcewithSave = source.system;
        const saveType = system.save?.value?.toLowerCase() ?? "";
        if (!isObject(system.save)) return;

        if (tupleHasValue(["fortitude", "reflex", "will"] as const, saveType)) {
            system.save.value = saveType;
        } else {
            system.save.value = "";
        }
    }
}

interface SpellSystemSourcewithSave extends SpellSystemSource {
    save?: { value?: string };
}
