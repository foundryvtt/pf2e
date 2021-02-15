import { Alignment, DamageImmunities, LabeledValue } from '@actor/actorDataDefinitions';
import { combineMaps, groupBy, max, toNumber } from './utils';
import { isChaotic, isEvil, isGood, isLawful } from './alignment';

/**
 * Looks through all values and only keeps the highest ones
 * @param values
 */
export function mergeResistancesOrWeaknesses(values: LabeledValue[]): LabeledValue[] {
    const valuesByType = groupBy(values, (value) => value.type);
    return Array.from(valuesByType.entries()).flatMap(([, value]) => {
        // fire resistance 5 and fire resistance 10 collapse to fire resistance 10
        // physical 5 (except silver) and physical 5 (except adamantine) are kept
        const groupedByException = groupBy(value, (value) => value.exceptions ?? null);
        return Array.from(groupedByException.entries()).map(([, value]) => {
            return max(value, (val) => toNumber(val.value) ?? 0);
        });
    });
}

/**
 * Only keeps unique immunities
 * @param values
 * @param additionalImmunities
 */
export function mergeImmunities(values: DamageImmunities, additionalImmunities: string[] = []): string[] {
    return Array.from(new Set(values.value.concat(values.custom).concat(...additionalImmunities)));
}

export type DamageType =
    | 'acid'
    | 'bludgeoning'
    | 'cold'
    | 'fire'
    | 'force'
    | 'electricity'
    | 'sonic'
    | 'negative'
    | 'piercing'
    | 'poison'
    | 'positive'
    | 'bleed'
    | 'mental'
    | 'precision'
    | 'slashing'
    | 'chaotic'
    | 'lawful'
    | 'good'
    | 'evil';

export type Alive = 'living' | 'undead' | 'neither';

const damageTypes = new Set();
damageTypes.add('acid');
damageTypes.add('bludgeoning');
damageTypes.add('cold');
damageTypes.add('fire');
damageTypes.add('force');
damageTypes.add('electricity');
damageTypes.add('sonic');
damageTypes.add('negative');
damageTypes.add('piercing');
damageTypes.add('poison');
damageTypes.add('positive');
damageTypes.add('bleed');
damageTypes.add('mental');
damageTypes.add('precision');
damageTypes.add('slashing');
damageTypes.add('chaotic');
damageTypes.add('lawful');
damageTypes.add('good');
damageTypes.add('evil');

export function isDamageType(value: string): value is DamageType {
    return damageTypes.has(value);
}

type Damage = Map<DamageType, number>;

export type AttackTrait =
    | 'nonlethal'
    | 'magical'
    | 'adamantine'
    | 'coldiron'
    | 'ghostTouch'
    | 'darkwood'
    | 'mithral'
    | 'silver'
    | 'orichalcum'
    | 'vorpal'
    | 'unarmed'
    | 'spell';

interface SplashDamage {
    type: DamageType;
    value: number;
}

function combineDamages(damages: Damage[]): Damage {
    return damages.reduce((previous, current) => {
        return combineMaps(previous, current, (a, b) => a + b);
    }, new Map());
}

/**
 * A single trait or damage combination can disable all resistance/weaknesses/immunities
 *
 * @param except
 * @param attackTraits
 * @param damageTypes
 */
function damageApplies(
    except: DamageExceptions,
    attackTraits: Set<AttackTrait>,
    damageTypes: Set<DamageType>,
): boolean {
    const combinedTraits = new Set(...attackTraits, ...damageTypes);
    return except.some((traitCombination) =>
        Array.from(traitCombination).every((trait) => {
            if (trait === 'non-magical') {
                return !combinedTraits.has('magical');
            } else {
                return combinedTraits.has(trait);
            }
        }),
    );
}

function ifImmunityApplies(
    immunitiesByType: Map<string, Immunities>,
    damage: Damage,
    attackTraits: Set<AttackTrait>,
    damageType: string,
    applyImmunity: () => void,
) {
    const immunities = immunitiesByType.get(damageType) ?? [];
    const allDamageTypes = new Set(damage.keys());
    const applicableImmunities = immunities.filter((immunity) =>
        damageApplies(immunity.except, attackTraits, allDamageTypes),
    );
    if (applicableImmunities.length > 0) {
        applyImmunity();
    }
}

function applyImmunities({
    normalDamage,
    criticalDamage,
    additionalCriticalDamage,
    ignoreImmunities,
    attackTraits,
    immunities,
    splashDamage,
}: {
    normalDamage: Damage;
    splashDamage?: SplashDamage;
    criticalDamage: Damage; // separate parameter because you can double damage or just roll double dice
    additionalCriticalDamage: Damage; // damage which gets added after doubling the previous damage
    attackTraits: Set<AttackTrait>;
    immunities: Immunities;
    ignoreImmunities: Set<string>;
}) {
    // replace object-immunities with their respective immunities
    const expandedImmunities = immunities.flatMap((immunity) => {
        if (immunity.damageType === 'object-immunities') {
            return ['bleed', 'poison', 'nonlethal attacks', 'mental'].map((type) => {
                return { damageType: type, except: immunity.except };
            });
        } else {
            return [immunity];
        }
    });
    const immunitiesByType = groupBy(expandedImmunities, (immunity: Immunity) => immunity.damageType);
    ignoreImmunities.forEach((ignoredImmunity) => immunitiesByType.delete(ignoredImmunity));

    // splash damage and additional critical damage like deadly always get added
    let damage = combineDamages([normalDamage, additionalCriticalDamage]);
    if (splashDamage !== undefined) {
        const splash = new Map();
        splash.set(splashDamage.type, splashDamage.value);
        damage = combineDamages([damage, splash]);
    }

    // check if critical damage is ignored otherwise combine it with normal damage
    ifImmunityApplies(immunitiesByType, damage, attackTraits, 'critical-hits', () => {
        criticalDamage = new Map();
    });
    damage = combineDamages([damage, criticalDamage]);

    // if nonlethal trait is present and monster is immune, throw away everything
    ifImmunityApplies(immunitiesByType, damage, attackTraits, 'nonlethal attacks', () => {
        damage.clear();
    });

    // check if precision damage is ignored
    ifImmunityApplies(immunitiesByType, damage, attackTraits, 'precision-damage', () => {
        damage.delete('precision');
    });

    // apply normal damage immunities
    Array.from(damage.keys())
        .filter((damageType) => damageType !== 'precision')
        .forEach((damageType) => {
            ifImmunityApplies(immunitiesByType, damage, attackTraits, damageType, () => {
                damage.delete(damageType);
            });
        });

    // if the target is immune to physical attacks, precision damage doesn't apply
    if (!hasPhysicalDamage(damage)) {
        damage.delete('precision');
    }

    return damage;
}

export function removeAlignmentDamage(damage: Damage, alignment: Alignment) {
    if (!isEvil(alignment)) {
        damage.delete('good');
    }
    if (!isGood(alignment)) {
        damage.delete('evil');
    }
    if (!isLawful(alignment)) {
        damage.delete('chaotic');
    }
    if (!isChaotic(alignment)) {
        damage.delete('lawful');
    }
}

export function removeUndeadLivingDamage(damage: Damage, alive: Alive) {
    if (alive === 'living') {
        damage.delete('positive');
    } else if (alive === 'undead') {
        damage.delete('negative');
        // Another special type of physical damage is bleed damage.
        // This is persistent damage that represents loss of blood. As such, it has
        // no effect on nonliving creatures or living creatures that don't need blood to live.
        damage.delete('bleed');
    } else {
        damage.delete('negative');
        damage.delete('positive');
    }
}

type DamageExceptions = Set<AttackTrait & DamageType>[];

export interface Resistance {
    damageType: string;
    value: number;
    doubleResistanceVsNonMagical: boolean;
    except: DamageExceptions;
}

export type Resistances = Resistance[];

export interface Weakness {
    damageType: string;
    value: number;
}

export type Weaknesses = Weakness[];

export interface Immunity {
    damageType: string;
    except: DamageExceptions;
}

export type Immunities = Immunity[];

/**
 * This method needs to deal with the following string value crap:
 * * except magical silver
 * * except force, ghost touch, or positive; double resistance vs. non-magical
 * * except adamantine or bludgeoning
 * * except cold iron
 * * except magical
 * * except unarmed attacks
 * * except non-magical
 * * except force or ghost touch
 * @param exceptions string as listed above
 */
export function parseExceptions(
    exceptions: string | undefined,
): { doubleResistanceVsNonMagical: boolean; except: DamageExceptions } {
    if (exceptions === undefined) {
        return {
            doubleResistanceVsNonMagical: false,
            except: [],
        };
    } else {
        const sanitizedExceptions = exceptions
            .toLocaleLowerCase()
            .replace('except', '')
            .replace(', or ', ' or ')
            .replace(', ', ' or ')
            .replace('unarmed attacks', 'unarmed')
            .replace('ghost touch', 'ghostTouch')
            .replace('cold iron', 'coldiron') // needed to match trait
            .trim();

        // double-resistance is trailing after the ; normal resistances are before that
        const traitExceptions = sanitizedExceptions.split(';');
        const traitCombinations = traitExceptions[0].split(' or ').map((value) => value.trim());
        const doubleResistanceVsNonMagical = traitExceptions[1]?.trim() === 'double resistance vs. non-magical';
        return {
            doubleResistanceVsNonMagical,
            except: traitCombinations.map((traitCombination) => {
                // assume traits to be separated by space
                return new Set(traitCombination.split(' '));
            }) as DamageExceptions,
        };
    }
}

export function parseResistances(values: LabeledValue[]): Resistances {
    return values.map((value) => {
        const { doubleResistanceVsNonMagical, except } = parseExceptions(value.exceptions);
        return {
            damageType: value.type,
            value: toNumber(value.value) ?? 0,
            doubleResistanceVsNonMagical,
            except,
        };
    });
}

export function parseWeakness(values: LabeledValue[]): Weaknesses {
    return values.map((value) => {
        const { except } = parseExceptions(value.exceptions);
        return {
            damageType: value.type,
            value: toNumber(value.value) ?? 0,
            except,
        };
    });
}

export function parseImmunities(values: LabeledValue[]): Immunities {
    return values.map((value) => {
        const { except } = parseExceptions(value.exceptions);
        return {
            damageType: value.type,
            except,
        };
    });
}

// function applyWeaknessIfPositive(damage: Damage, type: DamageType, value: number) {
//     const existingValue = damage.get(type);
//     if (existingValue !== undefined && existingValue > 0) {
//         damage.set(type, existingValue + value);
//     }
// }

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// function increasePhysicalDamage(damage: Damage, config: Weakness) {
//     applyWeaknessIfPositive(damage, 'slashing', config.value);
//     applyWeaknessIfPositive(damage, 'bludgeoning', config.value);
//     applyWeaknessIfPositive(damage, 'piercing', config.value);
// }
//

function hasPhysicalDamage(damage: Damage): boolean {
    return damage.has('piercing') || damage.has('slashing') || damage.has('bludgeoning');
}

// function applyWeaknesses({
//     damage,
//     isAreaDamage,
//     splashDamage,
//     weaknesses,
//     attackTraits,
// }: {
//     damage: Damage;
//     isAreaDamage: boolean;
//     splashDamage?: SplashDamage;
//     attackTraits: Set<string>;
//     weaknesses: Resistances;
// }) {
// const firstDamageType = damage.keys()[0];
// for (const [type, config] of weaknesses.entries()) {
//     if (type === 'vorpal weapons' && attackTraits.has('vorpal')) {
//         increasePhysicalDamage(damage, config);
//     } else if (attackTraits.has(type)) {
//         increasePhysicalDamage(damage, config);
//     } else if (type === 'critical hits') {
//         // https://2e.aonprd.com/MonsterFamilies.aspx?ID=103 lists critical weaknesses
//         // if physical damage is there, increase that, otherwise simply take the first
//         // damage type and increase it
//         if (hasPhysicalDamage(damage)) {
//             increasePhysicalDamage(damage, config);
//         } else {
//             applyWeaknessIfPositive(damage, firstDamageType, config.value);
//         }
//     } else if (type === 'splash-damage' && splashDamage !== undefined) {
//         applyWeaknessIfPositive(damage, splashDamage.type, config.value);
//     } else if (type === 'area-damage' && isAreaDamage) {
//         applyWeaknessIfPositive(damage, firstDamageType, config.value);
//     } else {
//         if (isDamageType(type)) {
//             applyWeaknessIfPositive(damage, type, config.value);
//         }
//     }
// }
// }

// function applyResistances({
//     damage,
//     isCriticalHit,
//     attackType,
//     reduceResistances,
//     resistances,
// }: {
//     damage: Damage;
//     isCriticalHit: boolean;
//     attackType: AttackType;
//     reduceResistances: Damage;
//     resistances: Weaknesses;
// }): number {
//     // TODO
//     console.log(damage);
//     console.log(isCriticalHit);
//     console.log(attackType);
//     console.log(reduceResistances);
//     console.log(resistances);
//     return 0;
// }

/**
 * Implementation of https://2e.aonprd.com/Rules.aspx?ID=342
 */
export function calculateDamage({
    isCriticalHit,
    isAreaDamage,
    normalDamage,
    splashDamage,
    criticalDamage,
    additionalCriticalDamage,
    reduceResistances,
    ignoreImmunities,
    attackTraits,
    alive,
    alignment,
    immunities,
    resistances,
    weaknesses,
}: {
    isCriticalHit: boolean; // some monsters have weaknesses or resistances to critical hits
    isAreaDamage: boolean;
    normalDamage: Damage;
    splashDamage?: SplashDamage;
    criticalDamage: Damage; // separate parameter because you can double damage or just roll double dice
    additionalCriticalDamage: Damage; // damage which gets added after doubling the previous damage
    reduceResistances: Damage; // oracle and druid have metamagic that allows them to ignore resistance up to a value
    ignoreImmunities: Set<string>;
    attackTraits: Set<AttackTrait>;
    alive: Alive;
    immunities: Immunities;
    resistances: Weaknesses;
    weaknesses: Resistances;
    alignment: Alignment;
}): number {
    // const damage = applyImmunities({
    //     normalDamage,
    //     criticalDamage,
    //     additionalCriticalDamage,
    //     attackTraits,
    //     immunities,
    //     ignoreImmunities,
    //     splashDamage,
    // });
    // removeUndeadLivingDamage(damage, isLiving, isUndead);
    // removeAlignmentDamage(alignment, damage);
    // applyWeaknesses({ damage, weaknesses, attackTraits, splashDamage, isAreaDamage });
    // applyResistances({ damage, resistances, reduceResistances, isCriticalHit, attackType });
    // TODO: check here if precision damage is used at all
    // combineDamage()
    // TODO: check here for critical hit resistance
    return 0;
}
