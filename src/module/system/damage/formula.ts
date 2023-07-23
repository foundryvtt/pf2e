import { DamageDicePF2e } from "@actor/modifiers.ts";
import { DEGREE_OF_SUCCESS, DegreeOfSuccessIndex } from "@system/degree-of-success.ts";
import { addSign, groupBy, sortBy, sum } from "@util";
import * as R from "remeda";
import {
    CriticalInclusion,
    DamageCategoryUnique,
    DamageFormulaData,
    DamagePartialTerm,
    DamageType,
    MaterialDamageEffect,
} from "./types.ts";
import { CRITICAL_INCLUSION } from "./values.ts";

/** A compiled formula with its associated breakdown */
interface AssembledFormula {
    formula: string;
    breakdown: string[];
}

/** Convert the damage definition into a final formula, depending on whether the hit is a critical or not. */
function createDamageFormula(
    damage: DamageFormulaData,
    degree: (typeof DEGREE_OF_SUCCESS)["SUCCESS" | "CRITICAL_SUCCESS"]
): AssembledFormula;
function createDamageFormula(damage: DamageFormulaData): AssembledFormula;
function createDamageFormula(damage: DamageFormulaData, degree: typeof DEGREE_OF_SUCCESS.CRITICAL_FAILURE): null;
function createDamageFormula(damage: DamageFormulaData, degree?: DegreeOfSuccessIndex): AssembledFormula | null;
function createDamageFormula(
    damage: DamageFormulaData,
    degree: DegreeOfSuccessIndex = DEGREE_OF_SUCCESS.SUCCESS
): AssembledFormula | null {
    damage = deepClone(damage);

    // Handle critical failure not dealing damage, and splash still applying on a failure
    // These are still couched on weapon/melee assumptions. They'll need to be adjusted later
    if (degree === DEGREE_OF_SUCCESS.CRITICAL_FAILURE) {
        return null;
    } else if (degree === DEGREE_OF_SUCCESS.FAILURE) {
        damage.dice = damage.dice.filter((d): d is DamageDicePF2e => d.category === "splash");
        damage.modifiers = damage.modifiers.filter((m) => m.damageCategory === "splash");
    }

    const critical = degree === DEGREE_OF_SUCCESS.CRITICAL_SUCCESS;
    if (!damage.base.length) {
        return null;
    }

    // Group dice by damage type
    const typeMap: DamageTypeMap = new Map();
    for (const baseEntry of damage.base) {
        const list = typeMap.get(baseEntry.damageType) ?? [];
        typeMap.set(baseEntry.damageType, list);

        if (baseEntry.terms) {
            list.push(...baseEntry.terms.map((t) => ({ ...baseEntry, ...t, label: null, critical: null })));
        } else if ((baseEntry.diceNumber && baseEntry.dieSize) || baseEntry.modifier) {
            const { diceNumber, dieSize, damageType } = baseEntry;
            const modifier = baseEntry.modifier ?? 0;
            const label = (() => {
                const diceSection = diceNumber ? `${diceNumber}${dieSize}` : null;
                if (!diceSection) return String(modifier);

                const displayedModifier = modifier ? Math.abs(modifier) : null;
                const operator = modifier < 0 ? " - " : " + ";
                return [diceSection, displayedModifier].filter((p) => p !== null).join(operator);
            })();

            list.push({
                label,
                dice: diceNumber && dieSize ? { number: diceNumber, faces: Number(dieSize.replace("d", "")) } : null,
                modifier,
                critical: null,
                damageType,
                category: baseEntry.category,
                materials: baseEntry.materials ?? [],
            });
        }
    }

    // Sometimes a weapon may add base damage as bonus modifiers or dice. We need to auto-generate these
    const BONUS_BASE_LABELS = ["PF2E.ConditionTypePersistent"].map((l) => game.i18n.localize(l));

    // Test that a damage modifier or dice partial is compatible with the prior check result
    const outcomeMatches = (m: { critical: boolean | null }): boolean => critical || m.critical !== true;

    // Add damage dice. Dice always stack
    for (const dice of damage.dice.filter((d) => d.enabled && outcomeMatches(d))) {
        const matchingBase = damage.base.find((b) => b.damageType === dice.damageType) ?? damage.base[0];
        const baseDieSize = Number(matchingBase.dieSize?.replace("d", "")) || matchingBase.terms?.[0].dice?.faces;
        const faces = Number(dice.dieSize?.replace("d", "")) || baseDieSize || null;
        const damageType = dice.damageType ?? matchingBase.damageType;
        if (dice.diceNumber > 0 && faces) {
            const list = typeMap.get(damageType) ?? [];
            list.push({
                label: BONUS_BASE_LABELS.includes(dice.label) ? null : `${dice.label} +${dice.diceNumber}d${faces}`,
                dice: { number: dice.diceNumber, faces },
                modifier: 0,
                damageType,
                category: dice.category,
                critical: dice.critical,
            });
            typeMap.set(damageType, list);
        }
    }

    // Add modifiers
    for (const modifier of damage.modifiers.filter((m) => m.enabled && outcomeMatches(m))) {
        const matchingBase = damage.base.find((b) => b.damageType === modifier.damageType) ?? damage.base[0];
        const damageType = modifier.damageType ?? matchingBase.damageType;

        const list = typeMap.get(damageType) ?? [];
        list.push({
            label: BONUS_BASE_LABELS.includes(modifier.label) ? null : `${modifier.label} ${addSign(modifier.value)}`,
            dice: null,
            modifier: modifier.value,
            damageType,
            category: modifier.damageCategory,
            critical: modifier.critical,
        });
        typeMap.set(damageType, list);
    }

    const instances = [
        instancesFromTypeMap(typeMap, { degree }),
        instancesFromTypeMap(typeMap, { degree, persistent: true }),
    ].flat();

    const commaSeparated = instances.map((i) => i.formula).join(",");
    const breakdown = instances.flatMap((i) => i.breakdown);
    return { formula: `{${commaSeparated}}`, breakdown };
}

/** Convert a damage type map to a final string formula. */
function instancesFromTypeMap(
    typeMap: DamageTypeMap,
    { degree, persistent = false }: { degree: DegreeOfSuccessIndex; persistent?: boolean }
): AssembledFormula[] {
    return Array.from(typeMap.entries()).flatMap(([damageType, typePartials]): AssembledFormula | never[] => {
        // Filter persistent (or filter out) based on persistent option
        const partials = typePartials.filter((p) => (p.category === "persistent") === persistent);
        if (partials.length === 0) return [];

        // Split into categories, which must be processed in a specific order
        const groups = groupBy(partials, (partial) => partial.category);

        const nonCriticalDamage = ((): string | null => {
            const criticalInclusion =
                degree === DEGREE_OF_SUCCESS.CRITICAL_SUCCESS
                    ? [CRITICAL_INCLUSION.DOUBLE_ON_CRIT]
                    : [CRITICAL_INCLUSION.DOUBLE_ON_CRIT, CRITICAL_INCLUSION.DONT_DOUBLE_ON_CRIT];

            // Whether to double the dice of these partials
            const doubleDice =
                degree === DEGREE_OF_SUCCESS.CRITICAL_SUCCESS &&
                criticalInclusion.includes(null) &&
                game.settings.get("pf2e", "critRule") === "doubledice";

            // If dice doubling is enabled, any doubling of dice or constants is handled by `createPartialFormulas`
            const double = degree === DEGREE_OF_SUCCESS.CRITICAL_SUCCESS && !doubleDice;
            return sumExpression(createPartialFormulas(groups, { criticalInclusion, doubleDice }), { double });
        })();

        const criticalDamage = ((): string | null => {
            if (degree !== DEGREE_OF_SUCCESS.CRITICAL_SUCCESS) return null;
            const criticalInclusion = [CRITICAL_INCLUSION.CRITICAL_ONLY, CRITICAL_INCLUSION.DONT_DOUBLE_ON_CRIT];
            return sumExpression(createPartialFormulas(groups, { criticalInclusion }));
        })();

        // Build final damage, and exit early if its 0 persistent dammage
        const summedDamage = sumExpression(degree ? [nonCriticalDamage, criticalDamage] : [nonCriticalDamage]);
        const enclosed = ensureValidFormulaHead(summedDamage) || "0";
        if (enclosed === "0" && persistent) return [];

        const flavor = ((): string => {
            const typeFlavor = damageType === "untyped" && !persistent ? [] : [damageType];
            const persistentFlavor = persistent ? ["persistent"] : [];
            const materialFlavor = typePartials.flatMap((p) => p.materials ?? []);
            const allFlavor = [typeFlavor, persistentFlavor, materialFlavor].flat().join(",");
            return allFlavor.length > 0 ? `[${allFlavor}]` : "";
        })();

        const breakdown = (() => {
            type DamagePartialWithLabel = DamagePartial & { label: string };

            const categories = [null, "persistent", "precision", "splash"] as const;
            const flattenedDamage = categories.flatMap((c) => {
                const partials = groups.get(c) ?? [];
                const breakdownDamage = partials.filter((e): e is DamagePartialWithLabel => e.label !== null);

                // Null labels are assumed to be base damage. Combine them and create a single breakdown component
                const leadingTerms = partials.filter(
                    (p) =>
                        p.label === null && (p.modifier || p.dice?.number || partials.every((pp) => pp.label === null))
                );
                if (leadingTerms.length) {
                    const append = c === "splash" ? ` ${game.i18n.localize("PF2E.Damage.RollFlavor.splash")}` : "";
                    const label = createSimpleFormula(leadingTerms) + append;
                    breakdownDamage.unshift({ ...leadingTerms[0], label });
                }

                return breakdownDamage;
            });
            const breakdownDamage = flattenedDamage.filter((d) => d.critical !== true);
            if (degree === DEGREE_OF_SUCCESS.CRITICAL_SUCCESS) {
                breakdownDamage.push(...flattenedDamage.filter((d) => d.critical === true));
            }

            if (!breakdownDamage.length) return [];

            // Gather label values and assign a damage type string to the first label in the list
            const damageTypeLabel =
                breakdownDamage[0].category === "persistent"
                    ? game.i18n.format("PF2E.Damage.PersistentTooltip", {
                          damageType: game.i18n.localize(CONFIG.PF2E.damageTypes[damageType] ?? damageType),
                      })
                    : game.i18n.localize(CONFIG.PF2E.damageTypes[damageType] ?? damageType);
            const labelParts = breakdownDamage.map((d) => d.label);
            labelParts[0] = `${labelParts[0].replace(/^\s+\+/, "")} ${damageTypeLabel}`;

            return labelParts;
        })();

        const formula = enclosed && flavor ? `${enclosed}${flavor}` : enclosed;
        return formula ? { formula, breakdown } : [];
    });
}

function createPartialFormulas(
    partials: Map<DamageCategoryUnique | null, DamagePartial[]>,
    { criticalInclusion, doubleDice = false }: PartialFormulaParams
): string[] {
    const categories = [null, "persistent", "precision", "splash"] as const;
    return categories.flatMap((category) => {
        const requestedPartials = (partials.get(category) ?? []).filter((p) => criticalInclusion.includes(p.critical));
        const term = ((): string => {
            const expression = createSimpleFormula(requestedPartials, { doubleDice });
            if (expression === "0") {
                return "";
            }
            return ["precision", "splash"].includes(category ?? "") && hasOperators(expression)
                ? `(${expression})`
                : expression;
        })();
        const flavored = term && category && category !== "persistent" ? `${term}[${category}]` : term;
        return flavored || [];
    });
}

/** Combines damage dice and modifiers into a simplified list of terms */
function combinePartialTerms(terms: DamagePartialTerm[]): DamagePartialTerm[] {
    const modifier = terms.reduce((total, p) => total + p.modifier, 0);
    const constantTerm: DamagePartialTerm | null = modifier ? { dice: null, modifier } : null;

    // Group dice by number of faces
    const dice = terms
        .filter((p): p is DamagePartial & { dice: NonNullable<DamagePartial["dice"]> } => !!p.dice && p.dice.number > 0)
        .sort(sortBy((t) => -t.dice.faces));

    const byFace = [...groupBy(dice, (t) => t.dice.faces).values()];
    const combinedDice = byFace.map((terms) => ({
        modifier: 0,
        dice: { ...terms[0].dice, number: sum(terms.map((d) => d.dice.number)) },
    }));

    const combined = R.compact([...combinedDice, constantTerm]);
    return combined.length ? combined : [{ dice: null, modifier: 0 }];
}

/** Combines damage dice and modifiers into a single formula, ignoring the damage type and category. */
function createSimpleFormula(terms: DamagePartialTerm[], { doubleDice }: { doubleDice?: boolean } = {}): string {
    terms = combinePartialTerms(terms);
    const constant = terms.find((t) => !!t.modifier)?.modifier ?? 0;
    const positiveDice = terms.filter(
        (t): t is DamagePartial & { dice: NonNullable<DamagePartial["dice"]> } => !!t.dice && t.dice.number > 0
    );

    const diceTerms = positiveDice.map((term) => {
        const number = doubleDice ? term.dice.number * 2 : term.dice.number;
        const faces = term.dice.faces;
        return doubleDice ? `(${number}d${faces}[doubled])` : `${number}d${faces}`;
    });

    // Create the final term. Double the modifier here if dice doubling is enabled
    const result = [diceTerms.join(" + "), Math.abs(constant)]
        .filter((e) => !!e)
        .map((e) => (typeof e === "number" && doubleDice ? `2 * ${e}` : e))
        .join(constant > 0 ? " + " : " - ");
    return result || "0"; // Empty string is an invalid formula
}

/**
 * Given a simple flavor-less formula with only +/- operators, returns a list of damage partial terms.
 * All subtracted terms become negative terms.
 */
function parseTermsFromSimpleFormula(
    formula: string | Roll,
    options?: { rollData: Record<string, unknown> }
): DamagePartialTerm[] {
    const roll = formula instanceof Roll ? formula : new Roll(formula, options?.rollData);

    // Parse from right to left so that when we hit an operator, we already have the term.
    return roll.terms.reduceRight((result, term) => {
        // Ignore + terms, we assume + by default
        if (term.expression === " + ") return result;

        // - terms modify the last term we parsed
        if (term.expression === " - ") {
            const termToModify = result[0];
            if (termToModify) {
                if (termToModify.modifier) termToModify.modifier *= -1;
                if (termToModify.dice) termToModify.dice.number *= -1;
            }
            return result;
        }

        result.unshift({
            modifier: term instanceof NumericTerm ? term.number : 0,
            dice: term instanceof Die ? { faces: term.faces, number: term.number } : null,
        });

        return result;
    }, <DamagePartialTerm[]>[]);
}

interface PartialFormulaParams {
    /** Whether critical damage is to be inconcluded in the generated formula and also doubled */
    criticalInclusion: CriticalInclusion[];
    /** Whether to double the dice of these partials */
    doubleDice?: boolean;
}

function sumExpression(terms: (string | null)[], { double = false } = {}): string | null {
    if (terms.every((t) => !t)) return null;

    const summed = terms.filter((p): p is string => !!p).join(" + ") || null;
    const enclosed = double && hasOperators(summed) ? `(${summed})` : summed;

    return double ? `2 * ${enclosed}` : enclosed;
}

/** Helper for helpers */
function hasOperators(formula: string | null): boolean {
    return /[-+*/]/.test(formula ?? "");
}

/** Ensures the formula is valid as a damage instance formula before flavor is attached */
function ensureValidFormulaHead(formula: string | null): string | null {
    if (!formula) return null;
    const isWrapped = /^\(.*\)$/.test(formula);
    const isSimple = /^\d+(d\d+)?$/.test(formula);
    return isWrapped || isSimple ? formula : `(${formula})`;
}

/** A pool of damage dice & modifiers, grouped by damage type. */
type DamageTypeMap = Map<DamageType, DamagePartial[]>;

interface DamagePartial extends DamagePartialTerm {
    /** Used to create the corresponding breakdown tag, if null it will be auto generated */
    label: string | null;
    damageType: DamageType;
    category: DamageCategoryUnique | null;
    critical: boolean | null;
    materials?: MaterialDamageEffect[];
}

export { AssembledFormula, combinePartialTerms, createSimpleFormula, createDamageFormula, parseTermsFromSimpleFormula };
