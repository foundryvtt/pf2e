import { DamageDicePF2e, ModifierPF2e } from "@actor/modifiers";
import { DegreeOfSuccessIndex, DEGREE_OF_SUCCESS } from "@system/degree-of-success";
import { groupBy } from "@util";
import { CriticalInclusion, DamageFormulaData, DamageType, MaterialDamageEffect } from "./types";
import { CRITICAL_INCLUSION } from "./values";

/** Convert the damage definition into a final formula, depending on whether the hit is a critical or not. */
function createDamageFormula(
    damage: DamageFormulaData,
    degree: typeof DEGREE_OF_SUCCESS["SUCCESS" | "CRITICAL_SUCCESS"]
): string;
function createDamageFormula(damage: DamageFormulaData): string;
function createDamageFormula(damage: DamageFormulaData, degree: typeof DEGREE_OF_SUCCESS.CRITICAL_FAILURE): null;
function createDamageFormula(damage: DamageFormulaData, degree?: DegreeOfSuccessIndex): string | null;
function createDamageFormula(
    damage: DamageFormulaData,
    degree: DegreeOfSuccessIndex = DEGREE_OF_SUCCESS.SUCCESS
): string | null {
    damage = deepClone(damage);

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
        typeMap.set(base.damageType, [
            {
                dice:
                    base.diceNumber && base.dieSize
                        ? { number: base.diceNumber, faces: Number(base.dieSize.replace("d", "")) }
                        : null,
                modifier: base.modifier ?? 0,
                critical: null,
                persistent: false,
                precision: false,
                splash: false,
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
                dice: { number: dice.diceNumber, faces: Number(dieSize.replace("d", "")) },
                modifier: 0,
                persistent: dice.category === "persistent",
                precision: dice.category === "precision",
                splash: dice.category === "splash",
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
            dice: null,
            modifier: modifier.value,
            persistent: modifier.damageCategory === "persistent",
            precision: modifier.damageCategory === "precision",
            splash: modifier.damageCategory === "splash",
            critical: modifier.critical,
        });
        typeMap.set(damageType, list);
    }

    const commaSeparated = [
        instancesFromTypeMap(typeMap, { degree }),
        instancesFromTypeMap(typeMap, { degree, persistent: true }),
    ]
        .flat()
        .join(",");

    return ["{", commaSeparated, "}"].join("");
}

/** Convert a damage type map to a final string formula. */
function instancesFromTypeMap(
    typeMap: DamageTypeMap,
    { degree, persistent = false }: { degree: DegreeOfSuccessIndex; persistent?: boolean }
): string[] {
    return Array.from(typeMap.entries()).flatMap(([damageType, typePartials]): string | never[] => {
        const partials = typePartials.filter((p) => p.persistent === persistent);
        if (partials.length === 0) return [];

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

            return sumExpression(
                [
                    partialFormula(partials, { criticalInclusion, doubleDice }),
                    partialFormula(partials, { criticalInclusion, doubleDice, special: "precision" }),
                    partialFormula(partials, { criticalInclusion, special: "splash" }),
                ],
                // If dice doubling is enabled, any doubling of dice or constants is handled by `partialFormula`
                { double: degree === DEGREE_OF_SUCCESS.CRITICAL_SUCCESS && !doubleDice }
            );
        })();

        const criticalDamage = ((): string | null => {
            const criticalInclusion = [CRITICAL_INCLUSION.CRITICAL_ONLY, CRITICAL_INCLUSION.DONT_DOUBLE_ON_CRIT];
            return degree === DEGREE_OF_SUCCESS.CRITICAL_SUCCESS
                ? sumExpression([
                      partialFormula(partials, { criticalInclusion }),
                      partialFormula(partials, { criticalInclusion, special: "precision" }),
                      partialFormula(partials, { criticalInclusion, special: "splash" }),
                  ])
                : null;
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

        return enclosed && flavor ? `${enclosed}${flavor}` : enclosed ?? [];
    });
}

function partialFormula(
    partials: DamagePartial[],
    { criticalInclusion, doubleDice = false, special = null }: PartialFormulaParams
): string | null {
    const isSpecialPartial = (p: DamagePartial): boolean => p.precision || p.splash;

    const requestedPartials = partials.filter(
        (p) => criticalInclusion.includes(p.critical) && (special ? p[special] : !isSpecialPartial(p))
    );
    // If dice doubling is requested, immediately double the constant
    const constant = requestedPartials.reduce((total, p) => total + p.modifier, 0);

    // Group dice by number of faces and combine into dice-expression strings
    const dice = requestedPartials.filter(
        (p): p is DamagePartial & { dice: NonNullable<DamagePartial["dice"]> } => !!p.dice && p.dice.number > 0
    );

    const combinedDice = Array.from(groupBy(dice, (p) => p.dice.faces).entries())
        .sort(([a], [b]) => b - a)
        .reduce((expressions: string[], [faces, partials]) => {
            const number = partials.reduce((total, p) => total + (doubleDice ? 2 * p.dice.number : p.dice.number), 0);

            // If dice doubling is requested, mark the dice with flavor text
            expressions.push(doubleDice ? `(${number}d${faces}[doubled])` : `${number}d${faces}`);

            return expressions;
        }, [])
        .join(" + ");

    const term = [combinedDice, Math.abs(constant)]
        .filter((e) => !!e)
        .map((e) => (typeof e === "number" && doubleDice ? `2 * ${e}` : e))
        .join(constant > 0 ? " + " : " - ");
    const flavored = term && special ? `${term}[${special}]` : term;

    return flavored || null;
}

interface PartialFormulaParams {
    /** Whether critical damage is to be inconcluded in the generated formula and also doubled */
    criticalInclusion: CriticalInclusion[];
    /** Whether to double the dice of these partials */
    doubleDice?: boolean;
    /** Whether this partial consists of precision or splash damage: kept separate for later IWR processing */
    special?: "precision" | "splash" | null;
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
    /** The static amount of damage of the current damage type and category. */
    modifier: number;
    /** Maps the die face ("d4", "d6", "d8", "d10", "d12") to the number of dice of that type. */
    dice: { number: number; faces: number } | null;
    splash: boolean;
    persistent: boolean;
    precision: boolean;
    critical: boolean | null;
    materials?: MaterialDamageEffect[];
}

export { createDamageFormula };
