import type { Snippet } from "svelte";
import type { Action } from "svelte/action";

interface TraitsProps {
    closeAfterSelect?: boolean;
    clearable?: boolean;
    creatable?: boolean;
    multiple?: boolean;
    options: TraitOption[];
    placeholder?: string;
    selection?: Snippet<[TraitOption[], Action<HTMLElement, TraitOption>]>;
    value?: string[];

    onChange?: (selection: TraitOption[]) => void;
}

interface TraitOption {
    label: string;
    value: string;
}

interface SvelecteI18n {
    empty: string;
    nomatch: string;
    max: (max: number) => string;
    fetchBefore: string;
    fetchQuery: (minQuery: number, inputLength: number) => string;
    fetchInit: string;
    fetchEmpty: string;
    collapsedSelection: (count: number) => string;
    createRowLabel: (value: string) => string;
    aria_selected: (opts: string[]) => string;
    aria_listActive: (opt: TraitOption, labelField: string, resultCount: number) => string;
    aria_inputFocused: () => string;
    aria_label: string;
    aria_describedby: string;
}

export type { SvelecteI18n, TraitOption, TraitsProps };
