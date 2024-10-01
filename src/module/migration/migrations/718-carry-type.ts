import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { EquippedData } from "@item/physical/data.ts";
import { getUsageDetails } from "@item/physical/usage.ts";
import { MigrationBase } from "../base.ts";

/** Update physical item usage and equipped to reflect carry types (held, worn, stowed) */
export class Migration718CarryType extends MigrationBase {
    static override version = 0.718;

    override async updateItem(source: ItemSourcePF2e, actor?: ActorSourcePF2e): Promise<void> {
        if (!itemIsOfType(source, "physical")) return;

        const system: SimplifiedSystemSource = source.system;

        // Correct some known past erronous usages
        if (!(system.usage instanceof Object)) {
            system.usage = { value: "held-in-one-hand" };
        }

        if (system.usage.value === "worn-gloves") {
            system.usage.value = "worngloves";
        } else if (source.type === "armor") {
            const category: string = source.system.category;
            system.usage.value = category === "shield" ? "held-in-one-hand" : "wornarmor";
        } else if (source.type === "equipment" && system.slug?.startsWith("clothing-")) {
            // Basic adventurer's gear clothing
            system.usage.value = "worn";
        }

        // Set some defaults or wipe equipped property if updating unowned compendium items
        if ("game" in globalThis || actor) {
            system.equipped ??= { carryType: "worn" };
            system.equipped.carryType ??= "worn";
        } else {
            delete (system as { equipped?: unknown }).equipped;
            return;
        }

        const equipped: OldEquippedData = system.equipped;
        if (!("value" in equipped)) return;

        if (!(actor && ["character", "npc"].includes(actor.type ?? ""))) {
            equipped["-=value"] = null;
            delete equipped.value;
            return;
        }

        // Remove dangling containerId references
        const containerId = source.system.containerId ?? { value: null };
        if (containerId instanceof Object && containerId.value) {
            const inStowingContainer = actor.items.some(
                (i) => i.type === "backpack" && i.system.stowing && i._id === containerId.value,
            );

            if (!inStowingContainer) {
                containerId.value = null;
            } else if (inStowingContainer) {
                equipped.carryType = "stowed";
                return;
            }
        }

        equipped.carryType = "worn";
        const usage = getUsageDetails(String(system.usage?.value));

        if (usage.type === "worn") {
            equipped.inSlot = !!equipped.value;
        } else if (usage.type === "held") {
            if (equipped.value) equipped.carryType = "held";
            equipped.handsHeld = equipped.value ? (usage.hands ?? 1) : 0;
        }

        equipped["-=value"] = null;
        delete equipped.value;
    }
}

type OldEquippedData = EquippedData & {
    value?: boolean;
    "-=value"?: null;
};

type SimplifiedSystemSource = { slug?: string | null; equipped?: OldEquippedData; usage?: { value?: unknown } };
