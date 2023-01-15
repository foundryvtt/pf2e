import { ErrorPF2e, fontAwesomeIcon } from "@util";
import { DamageInstance, DamageRoll } from "./roll";
import { ArithmeticExpression, Grouping, IntermediateDie } from "./terms";
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
function renderComponentDamage(term: RollTerm): HTMLElement {
    if (!["precision", "splash"].includes(term.flavor)) {
        throw ErrorPF2e("Unexpected error rendering damage roll");
    }

    const span = document.createElement("span");
    span.className = term.flavor;
    const [title, faClass] =
        term.flavor === "precision"
            ? [game.i18n.localize("PF2E.Damage.Precision"), "crosshairs"]
            : [game.i18n.localize("PF2E.TraitSplash"), "burst"];

    span.title = title;
    const icon = fontAwesomeIcon(faClass);
    icon.classList.add("icon");
    span.append(term.expression, " ", icon);

    return span;
}

function isSystemDamageTerm(term: RollTerm): term is ArithmeticExpression | Grouping {
    return term instanceof ArithmeticExpression || term instanceof Grouping;
}

function deepFindTerms(term: RollTerm, { flavor }: { flavor: string }): RollTerm[] {
    const childTerms =
        term instanceof Grouping ? [term.term] : term instanceof ArithmeticExpression ? term.operands : [];
    return [
        term.flavor.split(",").includes(flavor) ? [term] : [],
        childTerms.map((t) => deepFindTerms(t, { flavor })).flat(),
    ].flat();
}

/** A check for whether a string is a well-formed damage formula and most likely intended to be one */
function looksLikeDamageFormula(formula: string): boolean {
    return !formula.includes("d20") && DamageRoll.validate(formula);
}

/** Create a representative Font Awesome icon from a damage roll */
function damageDiceIcon(roll: DamageRoll | DamageInstance, { fixedWidth = true } = {}): HTMLElement {
    // Special case: an `IntermediateDie` with deterministic faces
    const firstTerm =
        roll instanceof DamageRoll && roll.instances[0]?.head instanceof IntermediateDie
            ? roll.instances[0]?.head
            : null;
    if (firstTerm?.faces instanceof NumericTerm && [4, 8, 6, 10, 12].includes(firstTerm.faces.number)) {
        return fontAwesomeIcon(`dice-d${firstTerm.faces.number}`, { fixedWidth });
    }

    const firstDice = roll.dice.at(0);
    const glyph =
        firstDice instanceof Die && [4, 8, 6, 10, 12].includes(firstDice.faces)
            ? `dice-d${firstDice.faces}`
            : firstDice
            ? "dice-d20"
            : "calculator";

    return fontAwesomeIcon(glyph, { fixedWidth });
}

/** Indicate in a term's options that it was multiplied by 2 or 3 */
function markAsCrit(term: RollTerm, multiplier: 2 | 3): void {
    term.options.crit = multiplier;
    if (term instanceof ArithmeticExpression) {
        markAsCrit(term.operands[0], multiplier);
        markAsCrit(term.operands[1], multiplier);
    } else if (term instanceof Grouping) {
        markAsCrit(term.term, multiplier);
    }
}

export {
    DamageCategorization,
    damageDiceIcon,
    deepFindTerms,
    isSystemDamageTerm,
    looksLikeDamageFormula,
    markAsCrit,
    nextDamageDieSize,
    renderComponentDamage,
};
