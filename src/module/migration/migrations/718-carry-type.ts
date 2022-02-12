import { ItemSourcePF2e } from "@item/data";
import { isPhysicalData } from "@item/data/helpers";
import { MigrationBase } from "../base";
import { ActorSourcePF2e } from "@actor/data";
import { EquippedData } from "@item/physical/data";
import { getUsageDetails } from "@item/physical/usage";

/** Update physical item usage and equipped to reflect carry types (held, worn, stowed) */
export class Migration718CarryType extends MigrationBase {
    static override version = 0.718;

    override async updateItem(itemData: ItemSourcePF2e, actor?: ActorSourcePF2e): Promise<void> {
        if (!isPhysicalData(itemData)) return;
        const systemData = itemData.data;

        // Correct erronous hyphen in worngloves usage
        if (systemData.usage.value === "worn-gloves") {
            systemData.usage.value = "worngloves";
        }

        if ("game" in globalThis || actor) {
            systemData.equipped ??= { carryType: "worn" };
            systemData.equipped.carryType ??= "worn";
        } else {
            delete (systemData as { equipped?: unknown }).equipped;
            return;
        }

        const equipped: OldEquippedData = systemData.equipped;

        if (actor) {
            const containerId = itemData.data.containerId.value;
            const inStowingContainer = actor.items.some(
                (i) => i.type === "backpack" && i.data.stowing && i._id === containerId
            );
            systemData.equipped.carryType = inStowingContainer ? "stowed" : "worn";

            if (!["character", "npc"].includes(actor.type ?? "")) {
                equipped["-=value"] = null;
                delete equipped.value;
                return;
            }
        }

        if ("value" in systemData.equipped) {
            const usage = getUsageDetails(systemData.usage.value);
            if (actor) {
                equipped.carryType = systemData.containerId.value ? "stowed" : "worn";
                if (usage.type === "worn" && usage.where) {
                    equipped.inSlot = !!equipped.value;
                } else if (usage.type === "held") {
                    equipped.handsHeld = 0;
                }
            }

            if (equipped.value) {
                if (usage.type === "held") {
                    equipped.carryType = "held";
                    equipped.handsHeld = usage.hands ?? 1;
                } else if (["held", "worn"].includes(usage.type)) {
                    equipped.carryType = "worn";
                }
            }

            equipped["-=value"] = null;
            delete equipped.value;
        }
    }
}

type OldEquippedData = EquippedData & {
    value?: boolean;
    "-=value"?: null;
};
