import { DamageDicePF2e, DeferredValueParams, ModifierAdjustment, ModifierPF2e } from "@actor/modifiers";
import { RollNotePF2e } from "@module/notes";
import { RollTwiceOption } from "@system/rolls";
import { isObject } from "@util";
import { BracketedValue } from "./rule-element/data";
import { DeferredDamageDice, RollSubstitution, RollTwiceSynthetic, RuleElementSynthetics } from "./synthetics";

/** Extracts a list of all cloned modifiers across all given keys in a single list. */
function extractModifiers(
    synthetics: Pick<RuleElementSynthetics, "modifierAdjustments" | "statisticsModifiers">,
    selectors: string[],
    options: DeferredValueParams = {}
): ModifierPF2e[] {
    const { modifierAdjustments, statisticsModifiers } = synthetics;
    const modifiers = Array.from(new Set(selectors))
        .flatMap((s) => statisticsModifiers[s] ?? [])
        .flatMap((d) => d(options) ?? []);
    for (const modifier of modifiers) {
        modifier.adjustments = extractModifierAdjustments(modifierAdjustments, selectors, modifier.slug);
    }

    return modifiers;
}

function extractModifierAdjustments(
    adjustmentsRecord: Record<string, ModifierAdjustment[]>,
    selectors: string[],
    slug: string
): ModifierAdjustment[] {
    const adjustments = Array.from(new Set(selectors.flatMap((s) => adjustmentsRecord[s] ?? [])));
    return adjustments.filter((a) => [slug, null].includes(a.slug));
}

/** Extracts a list of all cloned notes across all given keys in a single list. */
function extractNotes(rollNotes: Record<string, RollNotePF2e[]>, selectors: string[]) {
    return selectors.flatMap((s) => (rollNotes[s] ?? []).map((n) => n.clone()));
}

function extractDamageDice(
    deferredDice: { [K in string]?: DeferredDamageDice[] },
    selectors: string[],
    options: DeferredValueParams = {}
): DamageDicePF2e[] {
    return selectors.flatMap((s) => deferredDice[s] ?? []).flatMap((d) => d(options) ?? []);
}

function extractRollTwice(
    rollTwices: Record<string, RollTwiceSynthetic[]>,
    selectors: string[],
    options: Set<string>
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
    rollOptions: Set<string>
): RollSubstitution[] {
    return domains
        .flatMap((d) => deepClone(substitutions[d] ?? []))
        .filter((s) => s.predicate?.test(rollOptions) ?? true);
}

function isBracketedValue(value: unknown): value is BracketedValue {
    return isObject<{ brackets?: unknown }>(value) && Array.isArray(value.brackets);
}

export {
    extractDamageDice,
    extractModifierAdjustments,
    extractModifiers,
    extractNotes,
    extractRollSubstitutions,
    extractRollTwice,
    isBracketedValue,
};
