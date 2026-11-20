type ResettableInput = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/** Store a new value, resolving to the value now stored */
type Commit<T> = (value: T) => Promise<unknown>;

/**
 * Commit an input's value, then show the stored value. Svelte only rewrites `value` when its expression changes, so a
 * rejected, clamped or no-op update would otherwise leave the typed text showing.
 * @param commit Performs the update and resolves to the value now stored
 */
async function commitInput(input: ResettableInput, commit: () => Promise<unknown>): Promise<void> {
    const stored = await commit();
    if (input.type === "checkbox" && "checked" in input) {
        input.checked = !!stored;
    } else {
        input.value = stored === null || stored === undefined ? "" : String(stored);
    }
}

/** Parse a whole number from text input, or null if there isn't one */
function parseInteger(text: string): number | null {
    const trimmed = text.trim();
    if (trimmed === "") return null;
    const value = Number(trimmed);
    return Number.isFinite(value) ? Math.trunc(value) : null;
}

export { commitInput, parseInteger };
export type { Commit, ResettableInput };
