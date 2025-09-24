import type { ItemPF2e, PhysicalItemPF2e } from "@item";
import type { FrequencyInterval, ItemSourcePF2e, PhysicalItemSource } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { objectHasKey } from "@util";
import { Duration } from "luxon";
import validation = foundry.data.validation;

const itemHasCounterBadge = (item: ItemPF2e | ItemSourcePF2e): validation.DataModelValidationFailure | void => {
    const hasBadge = itemIsOfType(item, "condition")
        ? typeof item.system.value.value === "number"
        : itemIsOfType(item, "effect")
          ? item.system.badge?.type === "counter"
          : false;
    if (!hasBadge) {
        return new validation.DataModelValidationFailure({ message: "effect lacks a badge" });
    }
};

/** Adjust creature shield data due it being set before item alterations occur */
function adjustCreatureShieldData(item: PhysicalItemPF2e | PhysicalItemSource): void {
    if ("actor" in item && item.actor?.isOfType("character", "npc") && item.isOfType("shield")) {
        const heldShield = item.actor.heldShield;
        if (item === heldShield) {
            const shieldData = item.actor.attributes.shield;
            shieldData.ac = item.system.acBonus;
            shieldData.hardness = item.system.hardness;
            shieldData.hp.max = item.system.hp.max;
            shieldData.brokenThreshold = Math.floor(item.system.hp.max / 2);
        }
    }
}

/** Handle alterations for frequency intervals, which are luxon durations */
function getNewInterval(
    mode: "upgrade" | "downgrade" | "override" | string,
    current: FrequencyInterval,
    newValue: string,
): FrequencyInterval | validation.DataModelValidationFailure {
    if (!objectHasKey(CONFIG.PF2E.frequencies, newValue)) {
        return new validation.DataModelValidationFailure({ invalidValue: current, fallback: false });
    }
    if (mode === "override") return newValue;

    function getDuration(key: FrequencyInterval) {
        if (key === "turn" || key === "round") return Duration.fromISO("PT6S");
        if (key === "day") return Duration.fromISO("PT24H");
        return Duration.fromISO(key);
    }

    const newIsLonger =
        (newValue === "round" && current === "turn") ||
        (newValue === "PT24H" && current === "day") ||
        getDuration(newValue) > getDuration(current);
    return (mode === "upgrade" && newIsLonger) || (mode === "downgrade" && !newIsLonger) ? newValue : current;
}

export { adjustCreatureShieldData, getNewInterval, itemHasCounterBadge };
