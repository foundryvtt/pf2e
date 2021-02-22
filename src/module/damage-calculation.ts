import { combineMaps, groupBy, sum } from './utils';
import { isChaotic, isEvil, isGood, isLawful } from './alignment';
import { AlignmentString } from '@actor/actor-data-definitions';
import { Living } from './living';

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
    | 'evil'
    | 'untyped'; // overwritten by critical damage weaknesses if present

const allDamageTypes = new Set<string>();
allDamageTypes.add('acid');
allDamageTypes.add('bludgeoning');
allDamageTypes.add('cold');
allDamageTypes.add('fire');
allDamageTypes.add('force');
allDamageTypes.add('electricity');
allDamageTypes.add('sonic');
allDamageTypes.add('negative');
allDamageTypes.add('piercing');
allDamageTypes.add('poison');
allDamageTypes.add('positive');
allDamageTypes.add('bleed');
allDamageTypes.add('mental');
allDamageTypes.add('precision');
allDamageTypes.add('slashing');
allDamageTypes.add('chaotic');
allDamageTypes.add('lawful');
allDamageTypes.add('good');
allDamageTypes.add('evil');

export function isDamageType(value: string): value is DamageType {
    return allDamageTypes.has(value);
}

const physicalDamage = new Set<DamageType>();
physicalDamage.add('piercing');
physicalDamage.add('bludgeoning');
physicalDamage.add('slashing');

function isPhysicalDamageType(value: DamageType): boolean {
    return physicalDamage.has(value);
}

export type DamageExceptions = Set<AttackTrait & DamageType>[];

interface HasDamageExceptions {
    except: DamageExceptions;
}

export interface Resistance extends HasDamageExceptions {
    damageType: string;
    value: number;
    doubleResistanceVsNonMagical: boolean;
}

export interface Weakness extends HasDamageExceptions {
    damageType: string;
    value: number;
}

export interface Immunity extends HasDamageExceptions {
    damageType: string;
}

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
    | 'unarmed';

const allAttackTraits = new Set<string>();
allAttackTraits.add('nonlethal');
allAttackTraits.add('magical');
allAttackTraits.add('adamantine');
allAttackTraits.add('coldiron');
allAttackTraits.add('ghostTouch');
allAttackTraits.add('darkwood');
allAttackTraits.add('mithral');
allAttackTraits.add('silver');
allAttackTraits.add('orichalcum');
allAttackTraits.add('vorpal');
allAttackTraits.add('unarmed');
allAttackTraits.add('spell');

const physicalAttackTraits: AttackTrait[] = [
    'adamantine',
    'coldiron',
    'darkwood',
    'mithral',
    'silver',
    'orichalcum',
    'vorpal',
    'unarmed',
];

export type Damage = Map<DamageType, number>;

function sumDamage(damage: Damage): number {
    return sum(Array.from(damage.values()));
}

function combineDamages(damages: Damage[]): Damage {
    return damages.reduce((previous, current) => {
        return combineMaps(previous, current, (a, b) => a + b);
    }, new Map());
}

/**
 * A single trait or damage combination can disable all resistance/weaknesses/immunities.
 *
 * @param except
 * @param attackTraits
 * @param damageTypes
 * @return true if the current exception applies
 */
function exceptionApplies(
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

/**
 * This function is responsible for going through a list of possible modifiers, evaluating them against their
 * exceptions based on the given attackTraits and damage types present in the damage parameter and retrieving
 * the highest applicable value. For Immunities we default to 0 as value and only test if the returned
 * value isn't undefined.
 *
 * @param modifiersByType immunities/resistances/weaknesses grouped by damage type
 * @param damageTypes the dealt damage types
 * @param attackTraits traits of the attack, only used to determine if an exception applies
 * @param applicableModifierTypes which values from the given modifiersByType map should be used to find the highest
 * one; used for instance to group physical damage together
 * @param applyModifier callback that receives the highest applicable modifier
 * @param modifierValue callback that returns the final value, 0 if absent; used to sort and passed into the
 * applyModifier callback
 * @return value or undefined if no modifier has been found
 */
function findHighestModifier<T extends HasDamageExceptions>({
    modifiersByType,
    damageTypes,
    attackTraits,
    applicableModifierTypes,
    modifierValue = () => 0,
}: {
    modifiersByType: Map<string, T[]>;
    damageTypes: Set<DamageType>;
    attackTraits: Set<AttackTrait>;
    applicableModifierTypes: string[];
    modifierValue?: (modifier: T) => number;
}): number | undefined {
    return applicableModifierTypes
        .flatMap((damageType) => modifiersByType.get(damageType) ?? [])
        .filter((immunity) => !exceptionApplies(immunity.except, attackTraits, damageTypes))
        .map((value) => modifierValue(value))
        .sort()
        .reverse()[0];
}

function applyImmunities({
    isCriticalHit,
    normalDamage,
    criticalDamage,
    additionalCriticalDamage,
    attackTraits,
    immunities,
    areaDamageType,
}: {
    areaDamageType?: DamageType;
    isCriticalHit: boolean;
    normalDamage: Damage;
    criticalDamage: Damage; // separate parameter because you can double damage or just roll double dice
    additionalCriticalDamage: Damage; // damage which gets added after doubling the previous damage
    attackTraits: Set<AttackTrait>;
    immunities: Immunity[];
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
    const modifiersByType = groupBy(expandedImmunities, (immunity: Immunity) => immunity.damageType);

    // additional critical damage like deadly always get added
    let damage = combineDamages([normalDamage, additionalCriticalDamage]);

    // check if critical damage is ignored otherwise combine it with normal damage
    const damageTypes = new Set(damage.keys());
    if (isCriticalHit) {
        const modifier = findHighestModifier({
            modifiersByType,
            damageTypes,
            attackTraits,
            applicableModifierTypes: ['critical-hits'],
        });
        if (modifier !== undefined) {
            criticalDamage = new Map();
        }
    }
    damage = combineDamages([damage, criticalDamage]);

    // if nonlethal trait is present and monster is immune, throw away everything
    if (attackTraits.has('nonlethal')) {
        const modifier = findHighestModifier({
            modifiersByType,
            damageTypes,
            attackTraits,
            applicableModifierTypes: ['nonlethal attacks'],
        });
        if (modifier !== undefined) {
            damage.clear();
        }
    }

    // similarly immune to area damage removes everything
    if (areaDamageType !== undefined) {
        const modifier = findHighestModifier({
            modifiersByType,
            damageTypes,
            attackTraits,
            applicableModifierTypes: ['area-damage'],
        });
        if (modifier !== undefined) {
            damage.clear();
        }
    }

    // check if precision damage is ignored
    const precisionModifier = findHighestModifier({
        modifiersByType,
        damageTypes,
        attackTraits,
        applicableModifierTypes: ['precision-damage'],
    });
    if (precisionModifier !== undefined) {
        damage.delete('precision');
    }

    // apply normal damage immunities
    Array.from(damage.keys())
        .filter((damageType) => damageType !== 'precision')
        .forEach((damageType) => {
            const modifier = findHighestModifier({
                modifiersByType,
                damageTypes,
                attackTraits,
                applicableModifierTypes: [damageType],
            });
            if (modifier !== undefined) {
                damage.delete(damageType);
            }
        });

    return damage;
}

export function removeAlignmentDamage(damage: Damage, alignment: AlignmentString) {
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

export function removeUndeadLivingDamage(damage: Damage, living: Living) {
    if (living === 'living') {
        damage.delete('positive');
    } else if (living === 'undead') {
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

/**
 * Applies a weakness or resistance to an existing damage value
 *
 * @param damage complete damage
 * @param value increases damage of positive, reduces damage if negative. If the result
 * value is ever 0 or negative, the damage type will be removed from the damage
 * map
 * @param damageTypes a list of types to increase damage; usually an array with 1 element
 * but can be multiple in case of slashing, bludgeoning or piercing
 */
function addDamageIfPresent(damage: Damage, value: number, damageTypes: DamageType[]) {
    for (const damageType of damageTypes) {
        const damageValue = damage.get(damageType);
        if (damageValue !== undefined) {
            const targetValue = damageValue + value;
            if (targetValue > 0) {
                damage.set(damageType, targetValue);
            } else {
                damage.delete(damageType);
            }
        }
    }
}

function applyWeaknesses({
    damage,
    isCriticalHit,
    splashDamageType,
    weaknesses,
    attackTraits,
    areaDamageType,
}: {
    damage: Damage;
    isCriticalHit: boolean;
    areaDamageType?: DamageType;
    splashDamageType?: DamageType;
    attackTraits: Set<AttackTrait>;
    weaknesses: Weakness[];
}) {
    // weaknesses don't trigger if all damage was reduced
    if (sumDamage(damage) === 0) {
        return;
    }

    const modifiersByType = groupBy(weaknesses, (weakness: Weakness) => weakness.damageType);

    if (attackTraits.has('vorpal')) {
        const modifier = findHighestModifier({
            modifiersByType,
            damageTypes: new Set(damage.keys()),
            attackTraits,
            applicableModifierTypes: ['vorpal weapons'],
            modifierValue: (modifier) => modifier.value,
        });
        if (modifier !== undefined) {
            addDamageIfPresent(damage, modifier, Array.from(physicalDamage));
        }
    }

    if (isCriticalHit) {
        const modifier = findHighestModifier({
            modifiersByType,
            damageTypes: new Set(damage.keys()),
            attackTraits,
            applicableModifierTypes: ['critical hits'],
            modifierValue: (modifier) => modifier.value,
        });
        if (modifier !== undefined) {
            damage.set('untyped', modifier);
        }
    }

    if (splashDamageType !== undefined) {
        const modifier = findHighestModifier({
            modifiersByType,
            damageTypes: new Set(damage.keys()),
            attackTraits,
            applicableModifierTypes: ['splash-damage'],
            modifierValue: (modifier) => modifier.value,
        });
        if (modifier !== undefined) {
            addDamageIfPresent(damage, modifier, [splashDamageType]);
        }
    }

    if (areaDamageType !== undefined) {
        const modifier = findHighestModifier({
            modifiersByType,
            damageTypes: new Set(damage.keys()),
            attackTraits,
            applicableModifierTypes: ['area-damage'],
            modifierValue: (modifier) => modifier.value,
        });
        if (modifier !== undefined) {
            addDamageIfPresent(damage, modifier, [areaDamageType]);
        }
    }

    Array.from(damage.keys()).forEach((damageType) => {
        const applicableTypes = [damageType, 'all'];
        if (isPhysicalDamageType(damageType)) {
            applicableTypes.push('physical');
            // physical attacks also trigger weaknesses for materials if present
            physicalAttackTraits.filter((type) => attackTraits.has(type)).forEach((type) => applicableTypes.push(type));
        }
        const modifier = findHighestModifier({
            modifiersByType,
            damageTypes: new Set(damage.keys()),
            attackTraits,
            applicableModifierTypes: applicableTypes,
            modifierValue: (modifier) => modifier.value,
        });
        if (modifier !== undefined) {
            addDamageIfPresent(damage, modifier, [damageType]);
        }
    });
}

function calculateResistance(
    applicableResistanceTypes: string[],
    attackTraits: Set<AttackTrait>,
    modifier: Resistance,
): number {
    return Math.max(
        0,
        modifier.doubleResistanceVsNonMagical && !attackTraits.has('magical') ? modifier.value * 2 : modifier.value,
    );
}

function applyResistances({
    damage,
    isCriticalHit,
    attackTraits,
    resistances,
    precisionDamageType,
}: {
    damage: Damage;
    isCriticalHit: boolean;
    attackTraits: Set<AttackTrait>;
    resistances: Resistance[];
    precisionDamageType: DamageType;
}): number {
    const modifiersByType = groupBy(resistances, (resistance: Resistance) => resistance.damageType);

    // precision damage resistance applies first because it spills into the damage afterwards
    const precisionModifier = findHighestModifier({
        modifiersByType,
        damageTypes: new Set(damage.keys()),
        attackTraits,
        applicableModifierTypes: ['precision-damage'],
        modifierValue: (modifier) => calculateResistance(['precision-damage'], attackTraits, modifier),
    });
    if (precisionModifier !== undefined) {
        addDamageIfPresent(damage, -precisionModifier, [precisionDamageType]);
        damage.delete('precision');
    }

    Array.from(damage.keys()).forEach((damageType) => {
        const applicableTypes = [damageType, 'all'];
        if (isPhysicalDamageType(damageType)) {
            applicableTypes.push('physical');
            // physical attacks also trigger resistances for materials if present
            physicalAttackTraits.filter((type) => attackTraits.has(type)).forEach((type) => applicableTypes.push(type));
        }
        const modifier = findHighestModifier({
            modifiersByType,
            damageTypes: new Set(damage.keys()),
            attackTraits,
            applicableModifierTypes: applicableTypes,
            modifierValue: (modifier) => calculateResistance(applicableTypes, attackTraits, modifier),
        });
        addDamageIfPresent(damage, -modifier, [damageType]);
    });

    let totalDamage = sumDamage(damage);

    // critical hits resistance
    if (isCriticalHit) {
        const modifier = findHighestModifier({
            modifiersByType,
            damageTypes: new Set(damage.keys()),
            attackTraits,
            applicableModifierTypes: ['critical-hits'],
            modifierValue: (modifier) => calculateResistance(['critical-hits'], attackTraits, modifier),
        });
        if (modifier !== undefined) {
            totalDamage = Math.max(0, totalDamage - modifier);
        }
    }
    return totalDamage;
}

/**
 * Implementation of https://2e.aonprd.com/Rules.aspx?ID=342
 * @param normalDamage non critical damage, includes splash damage
 * @param precisionDamageType type of damage to which it should be added
 * @param criticalDamage passed in on a critical hit, usually the same as normalDamage excluding splash damage
 * @param additionalCriticalDamage includes damage that triggers off a critical, e.g. deadly
 * @param splashDamageType type of splash damage that is dealt, needed for swarms
 * @param areaDamage pass in the type of the damage if it originates from a spell cone/line/emanation, needed for swarms
 * @param attackTraits traits that are present on the attack; does not include energy types, check the enum values
 * @param living whether we need to apply positive/negative damage
 * @param alignment whether we need to apply alignment damage
 * @param immunities a list of immunities; one type can be present multiple times, we use the highest one
 * @param weaknesses a list of weaknesses; one type can be present multiple times, we use the highest one
 * @param resistances a list of resistances; one type can be present multiple times, we use the highest one
 * @return the final calculated damage
 */
export function calculateDamage({
    precisionDamageType,
    areaDamageType,
    normalDamage,
    splashDamageType,
    criticalDamage,
    additionalCriticalDamage,
    attackTraits,
    living,
    alignment,
    immunities,
    resistances,
    weaknesses,
}: {
    precisionDamageType: DamageType;
    areaDamageType?: DamageType;
    normalDamage: Damage;
    splashDamageType?: DamageType;
    criticalDamage: Damage;
    additionalCriticalDamage: Damage;
    attackTraits: Set<AttackTrait>;
    living: Living;
    immunities: Immunity[];
    resistances: Resistance[];
    weaknesses: Weakness[];
    alignment: AlignmentString;
}): number {
    const isCriticalHit = criticalDamage.size > 0;
    const damage = applyImmunities({
        isCriticalHit,
        normalDamage,
        criticalDamage,
        additionalCriticalDamage,
        attackTraits,
        immunities,
        areaDamageType,
    });
    removeUndeadLivingDamage(damage, living);
    removeAlignmentDamage(damage, alignment);
    applyWeaknesses({ isCriticalHit, damage, weaknesses, attackTraits, splashDamageType, areaDamageType });
    return applyResistances({ damage, resistances, isCriticalHit, attackTraits, precisionDamageType });
}
