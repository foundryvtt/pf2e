import { ModifierPF2e } from "@module/modifiers";
import { RollNotePF2e } from "@module/notes";

/** Extracts a list of all cloned modifiers across all given keys in a single list. */
export function extractModifiers(
    modifiers: Record<string, ModifierPF2e[]>,
    selectors: string[],
    options: { test?: string[] } = {}
) {
    return selectors
        .flatMap((selector) => modifiers[selector] ?? [])
        .map((modifier) => modifier.clone({ test: options.test }));
}

/** Extracts a list of all cloned notes across all given keys in a single list. */
export function extractNotes(rollNotes: Record<string, RollNotePF2e[]>, selectors: string[]) {
    return selectors.flatMap((option) => duplicate(rollNotes[option] ?? []));
}
