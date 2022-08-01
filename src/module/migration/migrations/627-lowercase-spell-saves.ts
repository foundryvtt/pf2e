import { ItemSourcePF2e } from "@item/data";
import { tupleHasValue } from "@util";
import { MigrationBase } from "../base";

const AllSaves = ["fortitude", "reflex", "will"] as const;

export class Migration627LowerCaseSpellSaves extends MigrationBase {
    static override version = 0.627;

    override async updateItem(itemData: ItemSourcePF2e) {
        if (itemData.type !== "spell") return;
        const saveType = itemData.system.save.value?.toLowerCase() ?? "";
        if (tupleHasValue(AllSaves, saveType)) {
            itemData.system.save.value = saveType;
        } else {
            itemData.system.save.value = "";
        }
    }
}
