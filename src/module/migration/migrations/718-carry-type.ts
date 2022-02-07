import { ItemSourcePF2e } from "@item/data";
import { isObject, setHasElement } from "@util";
import { isPhysicalData } from "@item/data/helpers";
import { ITEM_CARRY_TYPES } from "@item/data/values";
import { MigrationBase } from "../base";
import { ActorSourcePF2e } from "@actor/data";
import { EquippedData } from "../../item/physical/data";

/** Update physical item usage and equipped to reflect carry types (held, worn, stowed) */
export class Migration718CarryType extends MigrationBase {
    static override version = 0.718;

    override async updateItem(itemData: ItemSourcePF2e, actor?: ActorSourcePF2e): Promise<void> {
        if (actor?.type !== "character") return;

        if (isPhysicalData(itemData)) {
            const systemData = itemData.data;

            if (isObject(systemData.usage) && systemData.usage.value === "worn-gloves") {
                systemData.usage.value = "worngloves";
            }

            if ("value" in systemData.equipped && !setHasElement(ITEM_CARRY_TYPES, systemData.equipped.carryType)) {
                const equipped: ExistingEquipped = systemData.equipped;
                equipped.carryType = systemData.containerId.value ? "stowed" : "worn";
                if (equipped.value && equipped.carryType === "worn") {
                    equipped.inSlot = true;
                }
                equipped.handsHeld = 0;

                equipped["-=value"] = null;
                delete equipped.value;
            }
        }
    }
}

type ExistingEquipped = EquippedData & {
    value?: boolean;
    "-=value"?: null;
};
