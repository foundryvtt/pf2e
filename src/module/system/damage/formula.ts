import { DamageDicePF2e, ModifierPF2e } from "@actor/modifiers";
import { DegreeOfSuccessIndex, DEGREE_OF_SUCCESS } from "@system/degree-of-success";
import { groupBy } from "@util";
import { CriticalInclusion, DamageCategoryUnique, DamageFormulaData, DamageType, MaterialDamageEffect } from "./types";
import { CRITICAL_INCLUSION } from "./values";

/** A compiled formula with its associated breakdown */
interface AssembledFormula {
    formula: string;
    breakdown: string[];
}

/** Convert the damage definition into a final formula, depending on whether the hit is a critical or not. */
function createDamageFormula(
    damage: DamageFormulaData,
    degree: typeof DEGREE_OF_SUCCESS["SUCCESS" | "CRITICAL_SUCCESS"]
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
    const { base } = damage;

    // Group dice by damage type
    const typeMap: DamageTypeMap = new Map();
    if ((base.diceNumber && base.dieSize) || base.modifier) {
        const diceSection = base.diceNumber ? `${base.diceNumber}${base.dieSize}` : null;
        const modifier = base.modifier ? base.modifier : null;
        const label = [diceSection, modifier].filter((p) => p !== null).join(" + ");

        typeMap.set(base.damageType, [
            {
                label,
                dice:
                    base.diceNumber && base.dieSize
                        ? { number: base.diceNumber, faces: Number(base.dieSize.replace("d", "")) }
                        : null,
                modifier: base.modifier ?? 0,
                critical: null,
                category: base.category,
                materials: base.materials ?? [],
            },
        ]);
    }

    // Dice always stack
    for (const dice of damage.dice.filter((d) => d.enabled)) {
        const dieSize = dice.dieSize || base.dieSize || null;
        if (dice.diceNumber > 0 && dieSize) {
            const damageType = dice.damageType ?? base.damageType;
            const list = typeMap.get(damageType) ?? [];
            list.push({
                label: dice.label,
                dice: { number: dice.diceNumber, faces: Number(dieSize.replace("d", "")) },
                modifier: 0,
                category: dice.category,
                critical: dice.critical,
            });
            typeMap.set(damageType, list);
        }
    }

    // Test that a damage modifier or dice partial is compatible with the prior check result
    const outcomeMatches = (m: { critical: boolean | null }): boolean => critical || m.critical !== true;

    const modifiers = damage.modifiers
        .filter((m) => m.enabled)
        .flatMap((modifier): ModifierPF2e | never[] => {
            modifier.damageType ??= base.damageType;
            return outcomeMatches(modifier) ? modifier : [];
        });

    for (const modifier of modifiers) {
        const damageType = modifier.damageType ?? base.damageType;
        const list = typeMap.get(damageType) ?? [];
        list.push({
            label: `${modifier.label} ${modifier.value < 0 ? "" : "+"}${modifier.value}`,
            dice: null,
            modifier: modifier.value,
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

        const summedDamage = sumExpression(degree ? [nonCriticalDamage, criticalDamage] : [nonCriticalDamage]);
        const enclosed = hasOperators(summedDamage) ? `(${summedDamage})` : summedDamage;

        const flavor = ((): string => {
            const typeFlavor = damageType === "untyped" && !persistent ? [] : [damageType];
            const persistentFlavor = persistent ? ["persistent"] : [];
            const materialFlavor = typePartials.flatMap((p) => p.materials ?? []);
            const allFlavor = [typeFlavor, persistentFlavor, materialFlavor].flat().join(",");
            return allFlavor.length > 0 ? `[${allFlavor}]` : "";
        })();

        const breakdown = (() => {
            const categories = [null, "persistent", "precision", "splash"] as const;
            const flattenedDamage = categories.flatMap((c) => groups.get(c) ?? []);
            const breakdownDamage = flattenedDamage.filter((d) => d.critical !== true);
            if (degree === DEGREE_OF_SUCCESS.CRITICAL_SUCCESS) {
                breakdownDamage.push(...flattenedDamage.filter((d) => d.critical === true));
            }

            if (!breakdownDamage.length) return [];

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

        // If dice doubling is requested, immediately double the constant
        const constant = requestedPartials.reduce((total, p) => total + p.modifier, 0);

        // Group dice by number of faces and combine into dice-expression strings
        const dice = requestedPartials.filter(
            (p): p is DamagePartial & { dice: NonNullable<DamagePartial["dice"]> } => !!p.dice && p.dice.number > 0
        );

        const combinedDice = Array.from(groupBy(dice, (p) => p.dice.faces).entries())
            .sort(([a], [b]) => b - a)
            .reduce((expressions: string[], [faces, partials]) => {
                const number = partials.reduce(
                    (total, p) => total + (doubleDice ? 2 * p.dice.number : p.dice.number),
                    0
                );

                // If dice doubling is requested, mark the dice with flavor text
                expressions.push(doubleDice ? `(${number}d${faces}[doubled])` : `${number}d${faces}`);

                return expressions;
            }, [])
            .join(" + ");

        const term = [combinedDice, Math.abs(constant)]
            .filter((e) => !!e)
            .map((e) => (typeof e === "number" && doubleDice ? `2 * ${e}` : e))
            .join(constant > 0 ? " + " : " - ");
        const flavored = term && category && category !== "persistent" ? `${term}[${category}]` : term;

        return flavored || [];
    });
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

/** A pool of damage dice & modifiers, grouped by damage type. */
type DamageTypeMap = Map<DamageType, DamagePartial[]>;

interface DamagePartial {
    /** Used to create the corresponding breakdown tag */
    label: string;
    /** The static amount of damage of the current damage type and category. */
    modifier: number;
    /** Maps the die face ("d4", "d6", "d8", "d10", "d12") to the number of dice of that type. */
    dice: { number: number; faces: number } | null;
    category: DamageCategoryUnique | null;
    critical: boolean | null;
    materials?: MaterialDamageEffect[];
}

export { AssembledFormula, createDamageFormula };
