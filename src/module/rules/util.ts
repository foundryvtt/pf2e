import { DeferredValueParams, ModifierPF2e } from "@actor/modifiers";
import { RollNotePF2e } from "@module/notes";
import { RollTwiceOption } from "@system/rolls";
import { DeferredModifier, RollSubstitution, RollTwiceSynthetic } from "./rule-element/data";

/** Extracts a list of all cloned modifiers across all given keys in a single list. */
function extractModifiers(
    modifiers: Record<string, DeferredModifier[]>,
    selectors: string[],
    options: DeferredValueParams = {}
): ModifierPF2e[] {
    return selectors.flatMap((selector) => modifiers[selector] ?? []).flatMap((m) => m(options) ?? []);
}

/** Extracts a list of all cloned notes across all given keys in a single list. */
function extractNotes(rollNotes: Record<string, RollNotePF2e[]>, selectors: string[]) {
    return selectors.flatMap((s) => (rollNotes[s] ?? []).map((n) => n.clone()));
}

function extractRollTwice(
    rollTwices: Record<string, RollTwiceSynthetic[]>,
    selectors: string[],
    options: string[]
): RollTwiceOption {
    const twices = selectors.flatMap((s) => rollTwices[s] ?? []).filter((rt) => rt.predicate?.test(options) ?? true);
    if (twices.length === 0) return false;
    if (twices.some((rt) => rt.keep === "higher") && twices.some((rt) => rt.keep === "lower")) {
        return false;
    }

    return twices.at(0)?.keep === "higher" ? "keep-higher" : "keep-lower";
}

function extractRollSubstitutions(
    substitutions: Record<string, RollSubstitution[]>,
    domains: string[],
    rollOptions: string[]
): RollSubstitution[] {
    return domains
        .flatMap((d) => deepClone(substitutions[d] ?? []))
        .filter((s) => s.predicate?.test(rollOptions) ?? true);
}

export { extractModifiers, extractNotes, extractRollSubstitutions, extractRollTwice };
