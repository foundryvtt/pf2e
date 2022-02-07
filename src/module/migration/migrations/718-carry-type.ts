import { ItemSourcePF2e } from "@item/data";
import { setHasElement } from "@util";
import { isPhysicalData } from "@item/data/helpers";
import { ITEM_CARRY_TYPES } from "@item/data/values";
import { MigrationBase } from "../base";
import { ActorSourcePF2e } from "@actor/data";
import { EquippedData } from "../../item/physical/data";

export class Migration718CarryType extends MigrationBase {
    static override version = 0.718;

    override async updateItem(itemData: ItemSourcePF2e, actor?: ActorSourcePF2e): Promise<void> {
        if (actor === undefined || actor.type !== "character") return;

        if (
            isPhysicalData(itemData) &&
            "value" in itemData.data.equipped &&
            !setHasElement(ITEM_CARRY_TYPES, itemData.data.equipped.carryType)
        ) {
            const equipped: ExistingEquipped = itemData.data.equipped as unknown as ExistingEquipped;
            equipped.carryType = itemData.data.containerId.value ? "stowed" : "worn";
            if (equipped.value && equipped.carryType === "worn") {
                equipped.inSlot = true;
            }
            equipped.handsHeld = 0;

            equipped["-=value"] = null;
            delete equipped.value;
        }
    }
}

type ExistingEquipped = EquippedData & {
    value?: boolean;
    "-=value"?: null;
};
