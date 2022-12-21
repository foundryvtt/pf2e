import { fontAwesomeIcon } from "@util";
import { ArithmeticExpression, Grouping } from "./terms";
import { DamageCategory, DamageDieSize } from "./types";
import { BASE_DAMAGE_TYPES_TO_CATEGORIES, DAMAGE_DIE_FACES_TUPLE } from "./values";

function nextDamageDieSize(next: { upgrade: DamageDieSize }): DamageDieSize;
function nextDamageDieSize(next: { downgrade: DamageDieSize }): DamageDieSize;
function nextDamageDieSize(next: { upgrade: DamageDieSize } | { downgrade: DamageDieSize }): DamageDieSize {
    const [faces, direction] = "upgrade" in next ? [next.upgrade, 1] : [next.downgrade, -1];
    return DAMAGE_DIE_FACES_TUPLE[DAMAGE_DIE_FACES_TUPLE.indexOf(faces) + direction] ?? faces;
}

/** Provides constants for typical damage categories, as well as a simple API for adding custom damage types and categories. */
const DamageCategorization = {
    /**
     * Map a damage type to it's corresponding damage category. If the type has no category, the type itself will be
     * returned.
     */
    fromDamageType: (damageType: string): DamageCategory | null => BASE_DAMAGE_TYPES_TO_CATEGORIES[damageType] ?? null,

    /** Get a set of all damage categories (both base and custom). */
    allCategories: () => new Set(Object.values(BASE_DAMAGE_TYPES_TO_CATEGORIES)),

    /** Get a set of all of the base rule damage types. */
    baseCategories: () => new Set(Object.values(BASE_DAMAGE_TYPES_TO_CATEGORIES)),

    /** Map a damage category to the set of damage types in it. */
    toDamageTypes: (category: string) => {
        // Get all of the types in the current mappings which map to the given category
        const types = Object.entries(BASE_DAMAGE_TYPES_TO_CATEGORIES)
            .filter(([_key, value]) => value === category)
            .map(([key]) => key);

        // And return as a set to eliminate duplicates.
        return new Set(types);
    },
} as const;

/** Create a span element for displaying splash damage */
function renderSplashDamage(rollTerm: RollTerm): HTMLElement {
    const span = document.createElement("span");
    span.className = "splash";
    span.title = game.i18n.localize("PF2E.TraitSplash");
    const icon = fontAwesomeIcon("burst");
    icon.classList.add("icon");
    span.append(rollTerm.expression, " ", icon);

    return span;
}

function deepFindTerms(term: RollTerm, { flavor }: { flavor: string }): RollTerm[] {
    const childTerms =
        term instanceof Grouping ? [term.term] : term instanceof ArithmeticExpression ? term.operands : [];
    return [
        term.flavor.split(",").includes(flavor) ? [term] : [],
        childTerms.map((t) => deepFindTerms(t, { flavor })).flat(),
    ].flat();
}

/** A fast but weak check of whether a string looks like a damage-roll formula */
function looksLikeDamageFormula(formula: string): boolean {
    if (formula.includes("d20")) return false;
    return (
        // Any single dice pool
        /^\{[^}]+}$/.test(formula) ||
        // Simple dice expression followed by a flavor expression
        /^(?:\d+(?:d\d+)?)(?:\[[a-z]+(?:,[a-z]+)?\])$/.test(formula) ||
        // Parenthesized expression followed by a flavor expression
        /^\([^)]+\)\[[a-z]+(?:,[a-z]+)?\]$/.test(formula)
    );
}

export { DamageCategorization, deepFindTerms, looksLikeDamageFormula, nextDamageDieSize, renderSplashDamage };
