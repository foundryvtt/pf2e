import { ItemSourcePF2e } from "@item/data/index.ts";
import { isPhysicalData } from "@item/data/helpers.ts";
import { RARITIES } from "@module/data.ts";
import { tupleHasValue } from "@util";
import { ItemAlterationData } from "./schema.ts";

/** Is the item alteration valid for the item type? */
function validateAlteration(
    source: ItemSourcePF2e,
    alteration: ItemAlterationData
): asserts alteration is ItemAlterationData {
    const { value } = alteration;

    if (isPhysicalData(source) && tupleHasValue(RARITIES, value)) {
        return;
    }

    const sourceId = source.flags.core?.sourceId ? ` (${source.flags.core.sourceId})` : "";
    if (source.type !== "condition" && source.type !== "effect") {
        throw Error(`unable to alter "${source.name}"${sourceId}: must be condition or effect`);
    }

    const hasBadge =
        source.type === "condition"
            ? typeof source.system.value.value === "number"
            : source.type === "effect"
            ? source.system.badge?.type === "counter"
            : false;
    if (!hasBadge) {
        throw Error(`unable to alter "${source.name}"${sourceId}: effect lacks a badge`);
    }

    const positiveInteger = typeof value === "number" && Number.isInteger(value) && value > 0;
    // Hard-coded until condition data can indicate that it can operate valueless
    const nullValuedStun = value === null && source.system.slug === "stunned";
    if (!(positiveInteger || nullValuedStun)) {
        throw Error("badge-value alteration not applicable to item");
    }
}

/** Set the badge value of a condition or effect */
function applyAlterations(itemSource: ItemSourcePF2e, alterations: ItemAlterationData[]): void {
    for (const alteration of alterations) {
        validateAlteration(itemSource, alteration);

        const { value } = alteration;
        if (itemSource.type === "condition" && (typeof value === "number" || value === null)) {
            itemSource.system.value.value = value;
        } else if (itemSource.type === "effect" && typeof value === "number") {
            itemSource.system.badge!.value = value;
        } else if (isPhysicalData(itemSource) && tupleHasValue(RARITIES, value)) {
            itemSource.system.traits.rarity = value;
        }
    }
}

export { applyAlterations };
