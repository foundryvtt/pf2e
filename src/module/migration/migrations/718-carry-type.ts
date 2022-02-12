import { ItemSourcePF2e, PhysicalItemSource } from "@item/data";
import { isObject, setHasElement } from "@util";
import { isPhysicalData } from "@item/data/helpers";
import { ITEM_CARRY_TYPES } from "@item/data/values";
import { MigrationBase } from "../base";
import { EquippedData } from "@item/physical/data";
import { getUsageDetails } from "@item/physical/usage";

/** Update physical item usage and equipped to reflect carry types (held, worn, stowed) */
export class Migration718CarryType extends MigrationBase {
    static override version = 0.718;

    override async updateItem(itemData: ItemSourcePF2e): Promise<void> {
        if (!isPhysicalData(itemData)) return;
        const physicalItemData: PhysicalItemSource = itemData;
        const systemData = physicalItemData.data;

        if (isObject(systemData.usage) && systemData.usage.value === "worn-gloves") {
            systemData.usage.value = "worngloves";
        }

        if (isObject(systemData.equipped) && "value" in systemData.equipped) {
            const equipped: ExistingEquipped = systemData.equipped;
            if (!setHasElement(ITEM_CARRY_TYPES, systemData.equipped.carryType)) {
                equipped.carryType = systemData.containerId.value ? "stowed" : "worn";
                equipped.handsHeld = 0;
                const usage = getUsageDetails(systemData.usage.value);

                if (equipped.value) {
                    if (usage.type === "held") {
                        equipped.carryType = "held";
                        equipped.handsHeld = usage.hands ?? 1;
                    } else if (["held", "worn"].includes(usage.type)) {
                        equipped.carryType = "worn";
                    }
                }
                if (usage.type === "worn" && usage.where) {
                    equipped.inSlot = !!equipped.value;
                }
            }

            equipped["-=value"] = null;
            delete equipped.value;
        }
    }
}

type ExistingEquipped = EquippedData & {
    value?: boolean;
    "-=value"?: null;
};
