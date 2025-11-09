import type { ClientDocument } from "@client/documents/abstract/_module.d.mts";
import type { CompendiumIndexData } from "@client/documents/collections/compendium-collection.d.mts";
import type { AbilityItemPF2e, FeatPF2e, SpellPF2e } from "@item";
import { ItemPF2e } from "@item";
import { ActionCost, FrequencySource } from "@item/base/data/system.ts";
import type { FeatSheetPF2e } from "@item/feat/sheet.ts";
import { RangeData } from "@item/types.ts";
import { htmlQuery, isImageFilePath } from "@util";
import * as R from "remeda";
import type { AbilitySystemData, SelfEffectReference } from "./data.ts";
import type { AbilitySheetPF2e } from "./sheet.ts";

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
        changed.system = fu.mergeObject(changed.system, {
            actionType: { value: actionType },
            actions: { value: actionType !== "action" ? null : Math.clamp(actionCount, 1, 3) },
        });
    }
}

/** Adds sheet listeners for modifying frequency */
function activateActionSheetListeners(item: ItemPF2e & SourceWithFrequencyData, html: HTMLElement): void {
    htmlQuery(html, "a[data-action=frequency-add]")?.addEventListener("click", () => {
        const frequency: Partial<FrequencySource> = { max: 1, per: "day" };
        item.update({ system: { frequency } });
    });

    htmlQuery(html, "a[data-action=frequency-delete]")?.addEventListener("click", () => {
        item.update({ "system.frequency": null });
    });

    if (item.isOfType("action", "feat")) {
        htmlQuery(html, "a[data-action=delete-effect]")?.addEventListener("click", () => {
            if (item._source.system.selfEffect) {
                item.update({ "system.selfEffect": null });
            }
        });
    }
}

function getActionCostRollOptions(prefix: string, item: { actionCost?: ActionCost | null }): string[] {
    const actionCost = item.actionCost;
    if (!actionCost) return [];

    const value = actionCost.type === "free" ? 0 : actionCost.type === "reaction" ? 1 : (actionCost.value ?? 0);
    return [`${prefix}:action:type:${actionCost.type}`, `${prefix}:action:cost:${value}`];
}

/** Create data for the "self-applied effect" drop zone on an ability or feat sheet. */
function createSelfEffectSheetData(data: Maybe<SelfEffectReference>): SelfEffectSheetReference | null {
    if (!data) return null;
    type MaybeIndexData = ((ClientDocument | CompendiumIndexData) & { name?: string; img?: unknown }) | null;
    const indexEntry: MaybeIndexData = fromUuidSync(data.uuid);
    if (indexEntry?.name && isImageFilePath(indexEntry.img)) {
        data.name = indexEntry.name;
        data.img = indexEntry.img;
    }
    const parsedUUID = fu.parseUuid(data.uuid);
    const linkData = {
        id: parsedUUID?.id ?? null,
        type: parsedUUID?.type ?? null,
        pack:
            parsedUUID?.collection instanceof fd.collections.CompendiumCollection
                ? parsedUUID.collection.metadata.id
                : null,
    };

    return { ...data, ...linkData };
}

interface SelfEffectSheetReference extends SelfEffectReference {
    id: string | null;
    type: string | null;
    pack: string | null;
}

/** Save data from an effect item dropped on an ability or feat sheet. Returns true if handled */
async function handleSelfEffectDrop(sheet: AbilitySheetPF2e | FeatSheetPF2e, item: ItemPF2e): Promise<boolean> {
    if (!sheet.isEditable || sheet.item.system.actionType.value === "passive") {
        return false;
    }
    if (!item?.isOfType("effect")) return false;
    await sheet.item.update({ "system.selfEffect": { uuid: item.uuid, name: item.name } });
    return true;
}

function createActionRangeLabel(range: Maybe<RangeData>): string | null {
    if (!range?.max) return null;
    const [key, value] = range.increment
        ? ["PF2E.Action.Range.IncrementN", range.increment]
        : ["PF2E.Action.Range.MaxN", range.max];

    return game.i18n.format(key, { n: value });
}

/**  Add the holy/unholy trait to sanctified actions and spells if the owning actor is also holy/unholy */
function processSanctification(item: AbilityItemPF2e | FeatPF2e | SpellPF2e): void {
    const itemTraits: { value: string[] } = item.system.traits;
    if (!itemTraits.value.includes("sanctified")) return;

    const actorTraits: string[] = item.actor?.system.traits?.value ?? [];
    const isHoly = actorTraits.includes("holy");
    const isUnholy = actorTraits.includes("unholy");
    if ((isHoly || isUnholy) && !(isHoly && isUnholy)) {
        itemTraits.value = R.unique([...itemTraits.value, isHoly ? "holy" : "unholy"]).sort();
    }
}

export {
    activateActionSheetListeners,
    createActionRangeLabel,
    createSelfEffectSheetData,
    getActionCostRollOptions,
    handleSelfEffectDrop,
    normalizeActionChangeData,
    processSanctification,
};
