import { htmlClosest, htmlQuery, sortLabeledRecord } from "@util";

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
            data[path] = selections
                .filter((s: { id?: string; value?: string; readonly?: boolean }) => !s.readonly)
                .map((s: { id?: string; value?: string }) => s.id ?? s.value);
        }
    }
}

/** Override to refocus tagify elements in _render() to workaround handlebars full re-render */
async function maintainTagifyFocusInRender(sheet: DocumentSheet, renderLogic: () => Promise<void>) {
    const element = sheet.element[0];
    const active = document.activeElement;
    const activeWasHere = element?.contains(active);

    await renderLogic();

    // If the active element was a tagify that is part of this sheet, re-render
    if (activeWasHere && active?.classList.contains("tagify__input")) {
        const name = htmlClosest(active, "tags")?.dataset.name;
        if (name && sheet.element[0]) {
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

export {
    createSheetOptions,
    createSheetTags,
    maintainTagifyFocusInRender,
    processTagifyInSubmitData,
    SheetOption,
    SheetOptions,
};
