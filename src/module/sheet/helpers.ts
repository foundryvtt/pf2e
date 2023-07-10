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

function createTagifyTraits(
    traits: Iterable<string>,
    { sourceTraits, record }: TagifyTraitOptions
): { id: string; value: string; readonly: boolean }[] {
    const sourceSet = new Set(sourceTraits);
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
 * Process tagify elements in a form, converting their data into something the pf2e system can handle.
 * This method is meant to be called in _getSubmitData().
 */
function processTagifyInSubmitData(form: HTMLFormElement, data: Record<string, unknown>): void {
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
async function maintainFocusInRender(sheet: DocumentSheet, renderLogic: () => Promise<void>): Promise<void> {
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
    sourceTraits: Iterable<string>;
    record: Record<string, string>;
}

interface TraitTagifyEntry {
    id: string;
    value: string;
    readonly: boolean;
}

export {
    SheetOption,
    SheetOptions,
    TraitTagifyEntry,
    createSheetOptions,
    createSheetTags,
    createTagifyTraits,
    maintainFocusInRender,
    processTagifyInSubmitData,
};
