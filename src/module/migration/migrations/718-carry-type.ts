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

        // Correct some known past erronous usages
        if (!(systemData.usage instanceof Object)) {
            systemData.usage = { value: "held-in-one-hand" };
        }

        if (systemData.usage.value === "worn-gloves") {
            systemData.usage.value = "worngloves";
        } else if (itemData.type === "armor") {
            const { category } = itemData.data;
            systemData.usage.value = category === "shield" ? "held-in-one-hand" : "wornarmor";
        } else if (itemData.type === "equipment" && systemData.slug?.startsWith("clothing-")) {
            // Basic adventurer's gear clothing
            systemData.usage.value = "worn";
        }

        // Set some defaults or wipe equipped property if updating unowned compendium items
        if ("game" in globalThis || actor) {
            systemData.equipped ??= { carryType: "worn" };
            systemData.equipped.carryType ??= "worn";
        } else {
            delete (systemData as { equipped?: unknown }).equipped;
            return;
        }

        const equipped: OldEquippedData = systemData.equipped;
        if (!("value" in equipped)) return;

        if (!(actor && ["character", "npc"].includes(actor.type ?? ""))) {
            equipped["-=value"] = null;
            delete equipped.value;
            return;
        }

        // Remove dangling containerId references
        const containerId = itemData.data.containerId ?? { value: null };
        if (containerId instanceof Object && containerId.value) {
            const inStowingContainer = actor.items.some(
                (i) => i.type === "backpack" && i.data.stowing && i._id === containerId.value
            );

            if (!inStowingContainer) {
                containerId.value = null;
            } else if (inStowingContainer) {
                equipped.carryType = "stowed";
                return;
            }
        }

        equipped.carryType = "worn";
        const usage = getUsageDetails(systemData.usage.value);

        if (usage.type === "worn") {
            equipped.inSlot = !!equipped.value;
        } else if (usage.type === "held") {
            if (equipped.value) equipped.carryType = "held";
            equipped.handsHeld = equipped.value ? usage.hands ?? 1 : 0;
        }

        equipped["-=value"] = null;
        delete equipped.value;
    }
}

type OldEquippedData = EquippedData & {
    value?: boolean;
    "-=value"?: null;
};
