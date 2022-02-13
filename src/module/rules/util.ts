import { DeferredValueParams, ModifierPF2e } from "@module/modifiers";
import { RollNotePF2e } from "@module/notes";
import { DeferredModifier } from "./rule-element/data";

/** Extracts a list of all cloned modifiers across all given keys in a single list. */
export function extractModifiers(
    modifiers: Record<string, DeferredModifier[]>,
    selectors: string[],
    options: { test?: string[] } & DeferredValueParams = {}
): ModifierPF2e[] {
    return selectors
        .flatMap((selector) => modifiers[selector] ?? [])
        .map((m) => m(options) ?? [])
        .flat();
}

/** Extracts a list of all cloned notes across all given keys in a single list. */
export function extractNotes(rollNotes: Record<string, RollNotePF2e[]>, selectors: string[]) {
    return selectors.flatMap((option) => duplicate(rollNotes[option] ?? []));
}
