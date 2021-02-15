import { Alignment, DamageImmunities, LabeledValue } from '@actor/actorDataDefinitions';
import { groupBy, max, toNumber } from './utils';

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

export type AttackType = 'unarmed' | 'melee' | 'ranged' | 'spell';

export type AttackTraits =
    | 'nonlethal'
    | 'magical'
    | 'adamantine'
    | 'coldiron'
    | 'ghostTouch'
    | 'darkwood'
    | 'mithral'
    | 'silver'
    | 'orichalcum'
    | 'vorpal';

interface SplashDamage {
    type: DamageType;
    value: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// function combineDamages(damages: Damage[]): Damage {
//     return damages.reduce((previous, current) => {
//         return combineMaps(previous, current, (a, b) => a + b);
//     }, new Map());
// }

// function applyImmunities({
//     normalDamage,
//     criticalDamage,
//     additionalCriticalDamage,
//     ignoreImmunities,
//     attackTraits,
//     immunities,
//     splashDamage,
// }: {
//     normalDamage: Damage;
//     splashDamage?: SplashDamage;
//     criticalDamage: Damage; // separate parameter because you can double damage or just roll double dice
//     additionalCriticalDamage: Damage; // damage which gets added after doubling the previous damage
//     attackTraits: Set<string>;
//     immunities: Immunities;
//     ignoreImmunities: Set<string>;
// }) {
// // build immunities based on immunities that add immunities
// const copiedImmunities = new Set(...immunities);
// if (copiedImmunities.has('object-immunities')) {
//     ['bleed', 'poison', 'nonlethal attacks'].forEach((immunity) => copiedImmunities.add(immunity));
// }
// ignoreImmunities.forEach((ignoredImmunity) => copiedImmunities.delete(ignoredImmunity));
//
// // apply immunities to damage
// let damage = combineDamages([normalDamage, additionalCriticalDamage]);
// if (splashDamage !== undefined) {
//     const splash = new Map();
//     splash.set(splashDamage.type, splashDamage.value);
//     damage = combineDamages([damage, splash]);
// }
// if (!copiedImmunities.has('critical-hits')) {
//     // immunity to critical hits still triggers deadly but doesn't add double damage
//     damage = combineDamages([damage, criticalDamage]);
// }
// if (attackTraits.has('nonlethal') && copiedImmunities.has('nonlethal attacks')) {
//     damage.clear();
// }
// copiedImmunities.forEach((immunity) => {
//     if (isDamageType(immunity)) {
//         damage.delete(immunity);
//     }
// });
// return damage;
// }

// function removeAlignmentDamage(alignment: Alignment, damage: Damage) {
//     if (!isEvil(alignment)) {
//         damage.delete('good');
//     }
//     if (!isGood(alignment)) {
//         damage.delete('evil');
//     }
//     if (!isLawful(alignment)) {
//         damage.delete('chaotic');
//     }
//     if (!isChaotic(alignment)) {
//         damage.delete('lawful');
//     }
// }

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// function removeUndeadLivingDamage(damage: Damage, isLiving: boolean, isUndead: boolean) {
//     if (isLiving) {
//         damage.delete('positive');
//     } else if (isUndead) {
//         damage.delete('negative');
//         // Another special type of physical damage is bleed damage.
//         // This is persistent damage that represents loss of blood. As such, it has
//         // no effect on nonliving creatures or living creatures that don't need blood to live.
//         damage.delete('bleed');
//     }
// }

export interface Resistance {
    damageType: string;
    value: number;
    doubleResistanceVsNonMagical: boolean;
    except: Set<string>[];
}

export type Resistances = Resistance[];

export interface Weakness {
    damageType: string;
    value: number;
}

export type Weaknesses = Weakness[];

export interface Immunity {
    damageType: string;
    except: Set<string>[];
}

export type Immunities = Immunity[];

/**
 * This method needs to deal with the following string value crap:
 * * physical 10 (except magical silver)
 * * physical 24 (except bludgeoning adamantine)
 * * physical 15 (except magic bludgeoning)
 * * all 5 (except force, ghost touch, or positive; double resistance vs. non-magical)
 * * physical 20 (except vorpal adamantine)
 * * all 5 (except force, ghost touch, or negative; double resistance vs. non-magical)
 * * physical 12 (except adamantine or bludgeoning)
 * * physical 15 (except cold iron)
 * * physical 5 (except magical)
 * * all 15 (except unarmed attacks)
 * * all 15 (except non-magical)
 * * all 5 (except force or ghost touch)
 * @param exceptions
 */
export function parseExceptions(
    exceptions: string | undefined,
): { doubleResistanceVsNonMagical: boolean; except: Set<string>[] } {
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
            }),
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
// // eslint-disable-next-line @typescript-eslint/no-unused-vars
// function hasPhysicalDamage(damage: Damage) {
//     return damage.has('piercing') || damage.has('slashing') || damage.has('bludgeoning');
// }

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
    attackType,
    isAreaDamage,
    normalDamage,
    splashDamage,
    criticalDamage,
    additionalCriticalDamage,
    reduceResistances,
    ignoreImmunities,
    attackTraits,
    isUndead,
    isLiving,
    alignment,
    immunities,
    resistances,
    weaknesses,
}: {
    isCriticalHit: boolean; // some monsters have weaknesses or resistances to critical hits
    attackType: AttackType; // some monsters have resistance to everything except unarmed attacks or spells
    isAreaDamage: boolean;
    normalDamage: Damage;
    splashDamage?: SplashDamage;
    criticalDamage: Damage; // separate parameter because you can double damage or just roll double dice
    additionalCriticalDamage: Damage; // damage which gets added after doubling the previous damage
    reduceResistances: Damage; // oracle and druid have metamagic that allows them to ignore resistance up to a value
    ignoreImmunities: Set<string>;
    attackTraits: Set<AttackTraits>;
    isUndead: boolean;
    isLiving: boolean;
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
    // return applyResistances({ damage, resistances, reduceResistances, isCriticalHit, attackType });
    return 0;
}
