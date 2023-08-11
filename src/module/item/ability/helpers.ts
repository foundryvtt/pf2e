import { htmlQuery } from "@util";
import { AbilitySystemData } from "./data.ts";
import { FrequencySource } from "@item/data/base.ts";
import { ItemPF2e } from "@item";

interface SourceWithActionData {
    system: {
        actionType: AbilitySystemData["actionType"];
        actions: AbilitySystemData["actions"];
    };
}

interface SourceWithFrequencyData {
    system: {
        frequency?: AbilitySystemData["frequency"];
    };
}

/** Pre-update helper to ensure actionType and actions are in sync with each other */
function normalizeActionChangeData(document: SourceWithActionData, changed: DeepPartial<SourceWithActionData>): void {
    if (changed.system && ("actionType" in changed.system || "actions" in changed.system)) {
        const actionType = changed.system?.actionType?.value ?? document.system.actionType.value;
        const actionCount = Number(changed.system?.actions?.value ?? document.system.actions.value);
        changed.system = mergeObject(changed.system, {
            actionType: { value: actionType },
            actions: { value: actionType !== "action" ? null : Math.clamped(actionCount, 1, 3) },
        });
    }
}

/** Adds sheet listeners for modifying frequency */
function addSheetFrequencyListeners(item: ItemPF2e & SourceWithFrequencyData, html: HTMLElement): void {
    htmlQuery(html, "a[data-action=frequency-add]")?.addEventListener("click", () => {
        const frequency: FrequencySource = { max: 1, per: "day" };
        item.update({ system: { frequency } });
    });

    htmlQuery(html, "a[data-action=frequency-delete]")?.addEventListener("click", () => {
        item.update({ "system.-=frequency": null });
    });
}

export { addSheetFrequencyListeners, normalizeActionChangeData };
