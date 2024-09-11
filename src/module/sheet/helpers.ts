import { htmlClosest, htmlQuery, sortLabeledRecord } from "@util";
import * as R from "remeda";

/** Prepare form options on an item or actor sheet */
function createSheetOptions(
    options: Record<string, string | { label: string }>,
    selections: SheetSelections = [],
    { selected = false } = {},
): SheetOptions {
    const sheetOptions = Object.entries(options).reduce((compiledOptions: SheetOptions, [stringKey, value]) => {
        const selectionList = Array.isArray(selections) ? selections : selections.value;
        const key = typeof selectionList[0] === "number" ? Number(stringKey) : stringKey;
        const isSelected = selectionList.includes(key);
        if (isSelected || !selected) {
            compiledOptions[key] = {
                label: game.i18n.localize(R.isObjectType(value) ? value.label : value),
                value: stringKey,
                selected: isSelected,
            };
        }

        return compiledOptions;
    }, {});

    return sortLabeledRecord(sheetOptions);
}

function createSheetTags(
    options: Record<string, string | { label: string }>,
    selections: SheetSelections,
): SheetOptions {
    return createSheetOptions(options, selections, { selected: true });
}

function createTagifyTraits(
    traits: Iterable<string>,
    { sourceTraits, record }: TagifyTraitOptions,
): { id: string; value: string; readonly: boolean }[] {
    const sourceSet = new Set(sourceTraits ?? traits);
    const traitSlugs = [...traits];
    const readonlyTraits = traitSlugs.filter((t) => !sourceSet.has(t));
    return traitSlugs
        .map((slug) => {
            const label = game.i18n.localize(record?.[slug] ?? slug);
            return { id: slug, value: label, readonly: readonlyTraits.includes(slug) };
        })
        .sort((t1, t2) => t1.value.localeCompare(t2.value));
}

/**
 * Get a CSS class for an adjusted value
 * @param value A value from prepared/derived data
 * @param base A value from base/source data
 * @param options.better Which value is "better" in the context of the data: default is "higher"
 **/
function getAdjustment(
    value: number,
    base: number,
    { better = "higher" }: { better?: "higher" | "lower" } = {},
): "adjusted-higher" | "adjusted-lower" | null {
    if (value === base) return null;
    const isBetter = better === "higher" ? value > base : value < base;
    return isBetter ? "adjusted-higher" : "adjusted-lower";
}

function getAdjustedValue(value: number, reference: number, options?: { better?: "higher" | "lower" }): AdjustedValue {
    const adjustmentClass = getAdjustment(value, reference, options);
    return {
        value,
        adjustmentClass,
        adjustedHigher: adjustmentClass === "adjusted-higher",
        adjustedLower: adjustmentClass === "adjusted-lower",
    };
}

interface AdjustedValue {
    value: number;
    adjustedHigher: boolean;
    adjustedLower: boolean;
    adjustmentClass: "adjusted-higher" | "adjusted-lower" | null;
}

/** Override to refocus tagify elements in _render() to workaround handlebars full re-render */
async function maintainFocusInRender(sheet: Application, renderLogic: () => Promise<void>): Promise<void> {
    const element = sheet.element.get(0);
    const { activeElement } = document;
    const activeWasHere = element?.contains(activeElement);
    await renderLogic();
    if (!activeElement || !activeWasHere) return;

    // If the active element was a tagify that is part of this sheet, re-render
    if (activeElement instanceof HTMLInputElement && activeElement.dataset.property) {
        const sameInput = htmlQuery(element, `input[data-property="${activeElement.dataset.property}"]`);
        sameInput?.focus();
    } else if (activeElement.classList.contains("tagify__input")) {
        const name = htmlClosest(activeElement, "tags")?.dataset.name;
        if (name) {
            htmlQuery(element, `tags[data-name="${name}"] span[contenteditable]`)?.focus();
        }
    }
}

interface SheetOption {
    value: string;
    label: string;
    selected: boolean;
}

type SheetOptions = Record<string, SheetOption>;

type SheetSelections = { value: (string | number)[] } | (string[] & { custom?: never });

interface TagifyTraitOptions {
    sourceTraits?: Iterable<string>;
    record?: Record<string, string>;
}

interface TagifyEntry {
    id: string;
    value: string;
    readonly: boolean;
}

export {
    createSheetOptions,
    createSheetTags,
    createTagifyTraits,
    getAdjustedValue,
    getAdjustment,
    maintainFocusInRender,
};
export type { AdjustedValue, SheetOption, SheetOptions, TagifyEntry };
