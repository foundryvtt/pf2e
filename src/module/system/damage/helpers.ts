import { ErrorPF2e, fontAwesomeIcon, setHasElement } from "@util";
import { DamageInstance, DamageRoll } from "./roll.ts";
import { ArithmeticExpression, Grouping, IntermediateDie } from "./terms.ts";
import {
    BaseDamageData,
    DamageCategory,
    DamageCategoryUnique,
    DamageDieSize,
    DamagePartialTerm,
    DamageType,
} from "./types.ts";
import { BASE_DAMAGE_TYPES_TO_CATEGORIES, DAMAGE_CATEGORIES_UNIQUE, DAMAGE_DIE_FACES_TUPLE } from "./values.ts";
import { DamageDicePF2e } from "@actor/modifiers.ts";
import * as R from "remeda";
import { combinePartialTerms } from "./formula.ts";

function nextDamageDieSize(next: { upgrade: DamageDieSize }): DamageDieSize;
function nextDamageDieSize(next: { downgrade: DamageDieSize }): DamageDieSize;
function nextDamageDieSize(next: { upgrade: DamageDieSize } | { downgrade: DamageDieSize }): DamageDieSize {
    const [faces, direction] = "upgrade" in next ? [next.upgrade, 1] : [next.downgrade, -1];
    return DAMAGE_DIE_FACES_TUPLE[DAMAGE_DIE_FACES_TUPLE.indexOf(faces) + direction] ?? faces;
}

/** Provides constants for typical damage categories */
const DamageCategorization = {
    /** Map a damage type to its corresponding damage category, if any. */
    fromDamageType: (damageType: DamageType): DamageCategory | null => BASE_DAMAGE_TYPES_TO_CATEGORIES[damageType],

    /** Get a set of all damage categories (both base and custom). */
    allCategories: () => new Set(Object.values(BASE_DAMAGE_TYPES_TO_CATEGORIES)),

    /** Get a set of all of the base rule damage types. */
    baseCategories: () => new Set(Object.values(BASE_DAMAGE_TYPES_TO_CATEGORIES)),

    /** Map a damage category to the set of damage types in it. */
    toDamageTypes: (category: string): Set<string> => {
        // Get all of the types in the current mappings which map to the given category
        const types = Object.entries(BASE_DAMAGE_TYPES_TO_CATEGORIES)
            .filter(([_key, value]) => value === category)
            .map(([key]) => key);

        // And return as a set to eliminate duplicates.
        return new Set(types);
    },
} as const;

const FACES = [4, 6, 8, 10, 12];

/** Apply damage dice overrides and upgrades to a non-weapon's damage formula */
function applyDamageDiceOverrides(base: BaseDamageData[], dice: DamageDicePF2e[]): void {
    type RequiredNonNullable<T, K extends keyof T> = T & { [P in K]-?: NonNullable<T[P]> };
    const overrideDice = dice.filter(
        (d): d is RequiredNonNullable<DamageDicePF2e, "override"> => !d.ignored && !!d.override
    );

    if (!overrideDice.length) return;

    for (const data of base) {
        for (const adjustment of overrideDice) {
            const die = data.terms?.find((t): t is RequiredNonNullable<DamagePartialTerm, "dice"> => !!t.dice);
            if (!die) continue;

            die.dice.number = adjustment.override.diceNumber ?? die.dice.number;
            if (adjustment.override.dieSize) {
                const faces = Number(/\d{1,2}/.exec(adjustment.override.dieSize)?.shift());
                if (Number.isInteger(faces)) die.dice.faces = faces;
            } else if (adjustment.override.upgrade || adjustment.override.downgrade) {
                // die size increases are once-only for weapons, but has no such limit for non-weapons
                const direction = adjustment.override.upgrade ? 1 : -1;
                die.dice.faces = FACES[FACES.indexOf(die.dice.faces) + direction] ?? die.dice.faces;
            }
        }
    }
}

/**
 * Given a DamageRoll, reverts it into base damage data to allow adding modifiers and damage dice.
 * Throws an exception if it cannot be parsed
 */
function extractBaseDamage(roll: DamageRoll): BaseDamageData[] {
    interface DamagePartialWithCategory extends DamagePartialTerm {
        category: DamageCategoryUnique | null;
    }

    /** Internal function to recursively extract terms from a parsed DamageInstance's head term */
    function recursiveExtractTerms(
        expression: RollTerm,
        { category = null }: { category?: DamageCategoryUnique | null } = {}
    ): DamagePartialWithCategory[] {
        // If this expression introduces a category, override it when recursing
        category = setHasElement(DAMAGE_CATEGORIES_UNIQUE, expression.options.flavor)
            ? expression.options.flavor
            : category;

        // Recurse trivially for groupings
        if (expression instanceof Grouping) {
            return recursiveExtractTerms(expression.term, { category });
        }

        // Handle Die and Intermediate Die terms
        if (expression instanceof Die) {
            return [{ dice: R.pick(expression, ["number", "faces"]), modifier: 0, category }];
        } else if (expression instanceof IntermediateDie) {
            if (typeof expression.number !== "number" || typeof expression.faces !== "number") {
                throw ErrorPF2e("Unable to parse DamageRoll with non-deterministic intermediate expressions.");
            }
            return [{ dice: { number: expression.number, faces: expression.faces }, modifier: 0, category }];
        }

        // Resolve deterministic expressions and terms normally, everything is allowed
        // This handles NumericTerm, and ArithmeticTerm and MathTerm that don't have dice
        if (expression.isDeterministic) {
            return [{ dice: null, modifier: DamageInstance.getValue(expression, "expected"), category }];
        }

        // Non-deterministic ArithmeticExpression
        if (expression instanceof ArithmeticExpression) {
            const operator = expression.operator;
            if (operator === "*" || operator === "/") {
                throw ErrorPF2e(`Cannot use ${operator} on non-deterministic artithmetic terms`);
            }

            const leftTerms = recursiveExtractTerms(expression.operands[0], { category });
            const rightTerms = recursiveExtractTerms(expression.operands[1], { category });

            // Flip right side terms if subtraction
            if (operator === "-") {
                for (const term of rightTerms) {
                    if (term.dice) term.dice.number *= -1;
                    term.modifier *= -1;
                }
            }

            const groups = R.groupBy([...leftTerms, ...rightTerms], (t) => t.category ?? "");
            return Object.values(groups).flatMap((terms) => {
                const category = terms[0].category;
                return combinePartialTerms(terms).map((t): DamagePartialWithCategory => ({ ...t, category }));
            });
        }

        // At this point its an error, but we need to report what type it is
        if (!expression.isDeterministic) {
            throw ErrorPF2e(`Unable to parse DamageRoll with non-deterministic ${expression.constructor.name}.`);
        }
        throw ErrorPF2e("Unrecognized roll term type " + expression.constructor.name);
    }

    return roll.instances.flatMap((instance): BaseDamageData[] => {
        const category = setHasElement(DAMAGE_CATEGORIES_UNIQUE, instance.category) ? instance.category : null;
        const terms = recursiveExtractTerms(instance.head, { category });
        return Object.values(R.groupBy(terms, (t) => t.category ?? "")).map((terms) => {
            const category = instance.persistent ? "persistent" : terms[0].category;
            return { damageType: instance.type, category, terms: terms.map((t) => R.omit(t, ["category"])) };
        });
    });
}

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

/** Check whether a roll has dice terms associated with a damage roll */
function looksLikeDamageRoll(roll: Roll): boolean {
    const { dice } = roll;
    return (
        // Flat damage is still possibly a damage "roll"
        dice.length === 0 ||
        (dice.some((d) => [4, 6, 8, 10, 12].includes(d.faces ?? 20)) &&
            // Exclude if the roll has d2s (inclusive of `Coin`s) or d20s
            !dice.some((d) => [2, 20].includes(d.faces ?? 20)))
    );
}

/** Create a representative Font Awesome icon from a damage roll */
function damageDiceIcon(roll: DamageRoll | DamageInstance, { fixedWidth = false } = {}): HTMLElement {
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
    applyDamageDiceOverrides,
    damageDiceIcon,
    deepFindTerms,
    extractBaseDamage,
    isSystemDamageTerm,
    looksLikeDamageRoll,
    markAsCrit,
    nextDamageDieSize,
    renderComponentDamage,
};
