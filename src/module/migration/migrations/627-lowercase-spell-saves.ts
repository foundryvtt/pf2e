import { ItemSourcePF2e } from "@item/data/index.ts";
import { tupleHasValue } from "@util";
import { MigrationBase } from "../base.ts";

export class Migration627LowerCaseSpellSaves extends MigrationBase {
    static override version = 0.627;

    override async updateItem(itemData: ItemSourcePF2e): Promise<void> {
        if (itemData.type !== "spell") return;
        const saveType = itemData.system.save.value?.toLowerCase() ?? "";
        if (tupleHasValue(["fortitude", "reflex", "will"] as const, saveType)) {
            itemData.system.save.value = saveType;
        } else {
            itemData.system.save.value = "";
        }
    }
}
