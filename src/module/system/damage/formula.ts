import { DamageDicePF2e, ModifierPF2e } from "@actor/modifiers";
import { DegreeOfSuccessIndex, DEGREE_OF_SUCCESS } from "@system/degree-of-success";
import { groupBy } from "@util";
import { DamageCategorization } from "./helpers";
import { DamageFormulaData, DamageType } from "./types";

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
    if ((base.diceNumber && base.dieSize) || base.modifier > 0) {
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
            modifier.damageCategory ??= DamageCategorization.fromDamageType(modifier.damageType);
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
            critical: modifier.damageCategory === "splash" ? false : modifier.critical,
        });
        typeMap.set(damageType, list);
    }

    const commaSeparated = [
        instancesFromTypeMap(typeMap, { critical }),
        instancesFromTypeMap(typeMap, { critical, persistent: true }),
    ]
        .flat()
        .join(",");

    return ["{", commaSeparated, "}"].join("");
}

/** Convert a damage type map to a final string formula. */
function instancesFromTypeMap(
    typeMap: DamageTypeMap,
    { critical, persistent = false }: { critical: boolean; persistent?: boolean }
): string[] {
    return Array.from(typeMap.keys()).flatMap((damageType): string | never[] => {
        const partials = typeMap.get(damageType)!.filter((p) => (persistent ? p.persistent : !p.persistent));
        if (partials.length === 0) return [];

        const nonCriticalDamage = sumExpression(
            [
                partialFormula(partials, { critical: false }),
                partialFormula(partials, { special: "precision", critical: false }),
                critical ? null : partialFormula(partials, { special: "splash", critical: false }),
            ],
            { double: critical }
        );

        const criticalDamage = critical
            ? sumExpression([
                  partialFormula(partials, { critical: true }),
                  partialFormula(partials, { special: "precision", critical: true }),
                  partialFormula(partials, { special: "splash", critical: true }),
              ])
            : null;

        const summedDamage = sumExpression(critical ? [nonCriticalDamage, criticalDamage] : [nonCriticalDamage]);
        const enclosed = hasOperators(summedDamage) ? `(${summedDamage})` : summedDamage;

        const flavor = ((): string => {
            const typeFlavor = damageType === "untyped" && !persistent ? "" : damageType;
            const precisionFlavor = persistent ? ",persistent" : "";
            return `[${typeFlavor}${precisionFlavor}]`;
        })();

        return flavor ? `${enclosed}${flavor}` : enclosed;
    });
}

function partialFormula(
    partials: DamagePartial[],
    { special = null, critical }: { special?: "precision" | "splash" | null; critical: boolean }
): string | null {
    const isSpecialPartial = (p: DamagePartial): boolean => p.precision || p.splash;

    const requestedPartials = partials.filter(
        (p) => (critical ? p.critical !== null : !p.critical) && (special ? p[special] : !isSpecialPartial(p))
    );
    const constant = Math.max(
        requestedPartials.filter((p) => p.modifier > 0).reduce((total, p) => total + p.modifier, 0),
        0
    );

    // Group dice by number of faces and combine into dice-expression strings
    const dice = requestedPartials.filter(
        (p): p is DamagePartial & { dice: NonNullable<DamagePartial["dice"]> } => !!p.dice && p.dice.number > 0
    );

    const combinedDice = Array.from(groupBy(dice, (p) => p.dice.faces).entries())
        .sort(([a], [b]) => b - a)
        .reduce((expressions: string[], [faces, partials]) => {
            const number = partials.reduce((total, p) => total + p.dice.number, 0);
            expressions.push(`${number}d${faces}`);
            return expressions;
        }, []);

    const term = [combinedDice, constant || []].flat().join(" + ");
    const flavored = term && special ? `${term}[${special}]` : term;

    return flavored || null;
}

function sumExpression(terms: (string | null)[], { double = false } = {}): string {
    const summed = terms.filter((p): p is string => !!p).join(" + ");
    const enclosed = double && hasOperators(summed) ? `(${summed})` : summed;
    return double ? `2 * ${enclosed}` : enclosed;
}

/** Helper for helpers */
function hasOperators(formula: string): boolean {
    return /[-+*/]/.test(formula);
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
}

export { createDamageFormula };
