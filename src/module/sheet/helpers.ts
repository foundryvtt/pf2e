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

/**
 * Process tagify elements in a form, converting their data into something the pf2e system can handle.
 * This method is meant to be called in _getSubmitData().
 */
function processTagifyInSubmitData(form: HTMLFormElement, data: Record<string, unknown>) {
    // Tagify has a convention (used in their codebase as well) where it prepends the input element
    const tagifyInputElements = form.querySelectorAll<HTMLInputElement>("tags.tagify ~ input");
    for (const inputEl of tagifyInputElements.values()) {
        const path = inputEl.name;
        const inputValue = data[path];
        const selections = inputValue && typeof inputValue === "string" ? JSON.parse(inputValue) : inputValue;
        if (Array.isArray(selections)) {
            data[path] = selections.map((w: { id?: string; value?: string }) => w.id ?? w.value);
        }
    }
}

interface SheetOption {
    value: string;
    label: string;
    selected: boolean;
}

type SheetOptions = Record<string, SheetOption>;

type SheetSelections = { value: (string | number)[]; custom?: string } | (string[] & { custom?: never });

export { createSheetOptions, createSheetTags, processTagifyInSubmitData, SheetOption, SheetOptions };
