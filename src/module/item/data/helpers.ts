import { isObject } from "@util";
import {
    FeatData,
    ItemDataPF2e,
    ItemSourcePF2e,
    MagicItemData,
    MagicItemSource,
    PhysicalItemData,
    PhysicalItemSource,
    SpellData,
    TraitChatData,
} from ".";
import { ItemSystemData, ItemTraits } from "./base";
import { PHYSICAL_ITEM_TYPES } from "@item/physical/values";

export function isItemSystemData(data: unknown): data is ItemSystemData {
    return (
        isObject<Record<"description" | "rules" | "slug", unknown>>(data) &&
        isObject<{ value?: unknown }>(data.description) &&
        typeof data.description.value === "string" &&
        Array.isArray(data.rules) &&
        (data.slug === null || typeof data.slug === "string")
    );
}

/** Checks if the given item data is a physical item with a quantity and other physical fields. */
export function isPhysicalData(itemData: ItemSourcePF2e): itemData is PhysicalItemSource;
export function isPhysicalData(itemData: ItemDataPF2e): itemData is PhysicalItemData;
export function isPhysicalData(
    itemData: ItemSourcePF2e | ItemDataPF2e
): itemData is PhysicalItemSource | PhysicalItemData;
export function isPhysicalData(
    itemData: ItemSourcePF2e | ItemDataPF2e
): itemData is PhysicalItemSource | PhysicalItemData {
    const physicalItemTypes: Set<string> = PHYSICAL_ITEM_TYPES;
    return physicalItemTypes.has(itemData.type);
}

export function hasInvestedProperty(itemData: ItemSourcePF2e): itemData is MagicItemSource;
export function hasInvestedProperty(itemData: ItemDataPF2e): itemData is MagicItemData;
export function hasInvestedProperty(
    itemData: ItemSourcePF2e | ItemDataPF2e
): itemData is MagicItemSource | MagicItemData;
export function hasInvestedProperty(
    itemData: ItemSourcePF2e | ItemDataPF2e
): itemData is MagicItemSource | MagicItemData {
    return isPhysicalData(itemData) && "invested" in itemData.data.equipped;
}

export function isLevelItem(item: ItemDataPF2e): item is PhysicalItemData | FeatData | SpellData {
    return "level" in item.data;
}

type ItemChatData = Omit<ItemDataPF2e["data"], "traits"> & { traits: TraitChatData[] | ItemTraits };
type PhysicalChatData = Omit<PhysicalItemData["data"], "traits"> & { traits: TraitChatData[] | ItemTraits };

export function isItemChatData(data: Record<string, unknown>): data is ItemChatData {
    return isItemSystemData(data);
}

export function isPhysicalChatData(data: Record<string, unknown>): data is PhysicalChatData {
    return "quantity" in data && isItemSystemData(data);
}

export function isInventoryItem(type: string): boolean {
    switch (type) {
        case "armor":
        case "backpack":
        case "consumable":
        case "equipment":
        case "treasure":
        case "weapon": {
            return true;
        }
    }

    return false;
}
