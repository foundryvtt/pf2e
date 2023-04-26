import { isObject, setHasElement } from "@util/misc.ts";
import { ItemSourcePF2e, MagicItemSource, PhysicalItemSource } from "./index.ts";
import { ItemSystemData } from "./base.ts";
import { PHYSICAL_ITEM_TYPES } from "@item/physical/values.ts";

function isItemSystemData(data: unknown): data is ItemSystemData {
    return (
        isObject<Record<"description" | "rules" | "slug", unknown>>(data) &&
        isObject<{ value?: unknown }>(data.description) &&
        typeof data.description.value === "string" &&
        Array.isArray(data.rules) &&
        (data.slug === null || typeof data.slug === "string")
    );
}

/** Checks if the given item data is a physical item with a quantity and other physical fields. */
function isPhysicalData(source: ItemSourcePF2e): source is PhysicalItemSource;
function isPhysicalData(source: PreCreate<ItemSourcePF2e>): source is PreCreate<PhysicalItemSource>;
function isPhysicalData(source: ItemSourcePF2e | PreCreate<ItemSourcePF2e>): boolean {
    return setHasElement(PHYSICAL_ITEM_TYPES, source.type);
}

function hasInvestedProperty(source: ItemSourcePF2e): source is MagicItemSource {
    return isPhysicalData(source) && "invested" in source.system.equipped;
}

function isInventoryItem(type: string): boolean {
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

export { hasInvestedProperty, isInventoryItem, isItemSystemData, isPhysicalData };
