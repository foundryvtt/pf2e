import { EffectPF2e, ItemPF2e } from "@item";
import { FrequencySource } from "@item/base/data/system.ts";
import type { FeatSheetPF2e } from "@item/feat/sheet.ts";
import { RangeData } from "@item/types.ts";
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
        htmlQuery(html, "a[data-action=delete-effect]")?.addEventListener("click", () => {
            if (item._source.system.selfEffect) {
                item.update({ "system.-=selfEffect": null });
            }
        });
    }
}

/** Create data for the "self-applied effect" drop zone on an ability or feat sheet. */
function createSelfEffectSheetData(data: SelfEffectReference | null): SelfEffectSheetReference | null {
    if (!data) return null;

    type MaybeIndexData = ((ClientDocument | CompendiumIndexData) & { img?: unknown }) | null;
    const indexEntry: MaybeIndexData = fromUuidSync(data.uuid);
    if (indexEntry?.name && isImageFilePath(indexEntry.img)) {
        data.name = indexEntry.name;
        data.img = indexEntry.img;
    }
    const parsedUUID = foundry.utils.parseUuid(data.uuid);
    const linkData = {
        id: parsedUUID.documentId ?? null,
        type: parsedUUID.documentType ?? null,
        pack: parsedUUID.collection instanceof CompendiumCollection ? parsedUUID.collection.metadata.id : null,
    };

    return { ...data, ...linkData };
}

interface SelfEffectSheetReference extends SelfEffectReference {
    id: string | null;
    type: string | null;
    pack: string | null;
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

function createActionRangeLabel(range: Maybe<RangeData>): string | null {
    if (!range?.max) return null;
    const [key, value] = range.increment
        ? ["PF2E.Action.Range.IncrementN", range.increment]
        : ["PF2E.Action.Range.MaxN", range.max];

    return game.i18n.format(key, { n: value });
}

export {
    activateActionSheetListeners,
    createActionRangeLabel,
    createSelfEffectSheetData,
    handleSelfEffectDrop,
    normalizeActionChangeData,
};
