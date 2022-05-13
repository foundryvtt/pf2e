import { sortLabeledRecord } from "@util";

/** Prepare form options on an item or actor sheet */
function createSheetOptions(
    options: Record<string, string>,
    selections: SheetSelections = [],
    { selected = false } = {}
): SheetOptions {
    const sheetOptions = Object.entries(options).reduce((compiledOptions: SheetOptions, [stringKey, label]) => {
        const selectionList = Array.isArray(selections) ? selections : selections.value;
        const key = typeof selectionList[0] === "number" ? Number(stringKey) : stringKey;
        const isSelected = selectionList.includes(key);
        if (isSelected || !selected) {
            compiledOptions[key] = {
                label: game.i18n.localize(label),
                value: stringKey,
                selected: isSelected,
            };
        }

        return compiledOptions;
    }, {});

    if (selections.custom) {
        sheetOptions.custom = { label: selections.custom, value: "", selected: true };
    }

    return sortLabeledRecord(sheetOptions);
}

function createSheetTags(options: Record<string, string>, selections: SheetSelections): SheetOptions {
    return createSheetOptions(options, selections, { selected: true });
}

interface SheetOption {
    value: string;
    label: string;
    selected: boolean;
}

type SheetOptions = Record<string, SheetOption>;

type SheetSelections = { value: (string | number)[]; custom?: string } | (string[] & { custom?: never });

export { createSheetOptions, createSheetTags, SheetOption, SheetOptions };
