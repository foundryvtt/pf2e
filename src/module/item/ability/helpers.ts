import { EffectPF2e, ItemPF2e } from "@item";
import { FrequencySource } from "@item/data/base.ts";
import type { FeatSheetPF2e } from "@item/feat/sheet.ts";
import { ErrorPF2e, htmlQuery, isImageFilePath } from "@util";
import { AbilitySystemData, SelfEffectReference } from "./data.ts";
import type { ActionSheetPF2e } from "./sheet.ts";

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
function activateActionSheetListeners(item: ItemPF2e & SourceWithFrequencyData, html: HTMLElement): void {
    htmlQuery(html, "a[data-action=frequency-add]")?.addEventListener("click", () => {
        const frequency: FrequencySource = { max: 1, per: "day" };
        item.update({ system: { frequency } });
    });

    htmlQuery(html, "a[data-action=frequency-delete]")?.addEventListener("click", () => {
        item.update({ "system.-=frequency": null });
    });

    if (item.isOfType("action", "feat")) {
        const openSheetLink = htmlQuery(html, "a[data-action=open-effect-sheet]");
        openSheetLink?.addEventListener("click", async () => {
            const uuid = openSheetLink.dataset.uuid ?? "";
            const item = await fromUuid(uuid);
            if (item instanceof ItemPF2e) item.sheet.render(true);
        });

        htmlQuery(html, "a[data-action=delete-effect")?.addEventListener("click", () => {
            if (item._source.system.selfEffect) {
                item.update({ "system.-=selfEffect": null });
            }
        });
    }
}

/** Create data for the "self-applied effect" drop zone on an ability or feat sheet. */
function createSelfEffectSheetData(
    data: SelfEffectReference | null
): SelfEffectReference | { name: string; empty: true } {
    if (data && !data.img) {
        type MaybeIndexData = ((ClientDocument | CompendiumIndexData) & { img?: unknown }) | null;
        const indexEntry: MaybeIndexData = fromUuidSync(data.uuid);
        if (indexEntry?.name && isImageFilePath(indexEntry.img)) {
            data.name = indexEntry.name;
            data.img = indexEntry.img;
        }
    }

    return data ?? { name: "Drop Effect", empty: true };
}

/** Save data from an effect item dropped on an ability or feat sheet. */
async function handleSelfEffectDrop(sheet: ActionSheetPF2e | FeatSheetPF2e, event: ElementDragEvent): Promise<void> {
    if (!sheet.isEditable || sheet.item.system.actionType.value === "passive") {
        return;
    }
    const item = await (async (): Promise<ItemPF2e | null> => {
        try {
            const dataString = event.dataTransfer?.getData("text/plain");
            const dropData = JSON.parse(dataString ?? "");
            return (await ItemPF2e.fromDropData(dropData)) ?? null;
        } catch {
            return null;
        }
    })();
    if (!(item instanceof EffectPF2e)) throw ErrorPF2e("Invalid item drop");

    await sheet.item.update({ "system.selfEffect": { uuid: item.uuid, name: item.name } });
}

export { activateActionSheetListeners, createSelfEffectSheetData, handleSelfEffectDrop, normalizeActionChangeData };
