import { groupBy, sum } from './utils';
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
    | 'slashing'
    | 'chaotic'
    | 'lawful'
    | 'good'
    | 'evil';

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
    | 'nonlethal attacks'
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

type CombinedTraits = AttackTrait | DamageType | 'all' | 'physical';

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

export type Damage = Map<
    DamageType,
    {
        normal: number;
        critical: number;
        precision: number;
        traits: Set<AttackTrait>;
    }
>;

/**
 * A single trait or damage combination can disable all resistance/weaknesses/immunities.
 * @param exceptions parsed except block
 * @param combinedTraits all traits applicable for the damage pool
 * @return true if the current exception applies
 */
function exceptionApplies(exceptions: DamageExceptions, combinedTraits: Set<string>): boolean {
    return exceptions.some((traitCombination) =>
        Array.from(traitCombination).every((trait) => {
            if (trait === 'non-magical') {
                return !combinedTraits.has('magical');
            } else {
                return combinedTraits.has(trait);
            }
        }),
    );
}

function denormalizeTraits(damageType: DamageType, attackTraits: Set<AttackTrait>): Set<CombinedTraits> {
    const result: Set<CombinedTraits> = new Set<CombinedTraits>();
    result.add('all');
    if (isPhysicalDamageType(damageType)) {
        result.add('physical');
    }
    Array.from(attackTraits).forEach((trait) => result.add(trait));
    return result;
}

/**
 * Find out which modifiers apply for the given damage traits
 *
 * @param modifiersByType modifiers grouped by damage type
 * @param damageTraits all traits that should considered for this pool of damage
 * @param allAttackTraits all damage types and traits present for this attack
 * @return a list of modifiers filtered by their except blocks
 */
function filterModifiers<T extends HasDamageExceptions>(
    modifiersByType: Map<string, T[]>,
    damageTraits: Set<string>,
    allAttackTraits: Set<string>,
): T[] {
    return Array.from(damageTraits)
        .flatMap((trait) => modifiersByType.get(trait) ?? [])
        .filter((modifier) => !exceptionApplies(modifier.except, allAttackTraits));
}

/**
 * This function is responsible for going through a list of possible modifiers, evaluating them against their
 * exceptions based on the given traits.
 *
 * @return value or undefined if no modifier has been found
 */
function findHighestModifier<T extends HasDamageExceptions>(
    modifiersByType: Map<string, T[]>,
    damageTraits: Set<string>,
    allAttackTraits: Set<string>,
    modifierValue: (modifier: T) => number,
): number | undefined {
    return filterModifiers(modifiersByType, damageTraits, allAttackTraits)
        .map((value) => modifierValue(value))
        .sort((a, b) => a - b) // https://i.redd.it/5ik1hby4ngk61.png
        .reverse()[0];
}

function applyImmunities(damage: Damage, allAttackTraits: Set<string>, immunities: Immunity[]): void {
    // replace object-immunities with their respective immunities
    const denormalizedImmunities = immunities.flatMap((immunity) => {
        if (immunity.damageType === 'object-immunities') {
            return ['bleed', 'poison', 'nonlethal attacks', 'mental'].map((type) => {
                return { damageType: type, except: immunity.except };
            });
        } else {
            return [immunity];
        }
    });

    const modifiersByType = groupBy(denormalizedImmunities, (immunity: Immunity) => immunity.damageType);

    Array.from(damage.entries()).forEach(([damageType, value]) => {
        // critical hits immunity completely removes critical damage
        const attackTraits = value.traits;
        if (
            filterModifiers(modifiersByType.get('critical-hits') ?? [], denormalizeTraits(damageType, attackTraits))
                .length > 0
        ) {
            value.critical = 0;
        }

        // precision immunity completely removes precision damage
        if (
            filterModifiers(modifiersByType.get('precision-damage') ?? [], denormalizeTraits(damageType, attackTraits))
                .length > 0
        ) {
            value.precision = 0;
        }

        if (
            filterModifiers(modifiersByType.get(damageType) ?? [], denormalizeTraits(damageType, attackTraits)).length >
            0
        ) {
            value.normal = 0;
            value.precision = 0;
            value.critical = 0;
        }
    });
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

export function removePositiveOrNegativeDamage(damage: Damage, living: Living) {
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
 * Applies a weakness or resistance to an existing damage value; if that
 * damage is not present in the damage map, nothing is added
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
    allAttackTraits,
    weaknesses,
    splashDamageType,
    areaDamageType,
}: {
    damage: Damage;
    allAttackTraits: Set<string>;
    areaDamageType?: DamageType;
    splashDamageType?: DamageType;
    weaknesses: Weakness[];
}): void {
    const modifiersByType = groupBy(weaknesses, (weakness: Weakness) => weakness.damageType);
    const damageTypes = new Set(damage.keys());

    if (attackTraits.has('vorpal')) {
        const modifier = findHighestModifier({
            modifiersByType,
            damageTypes: damageTypes,
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
            damageTypes: damageTypes,
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
            damageTypes: damageTypes,
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
            damageTypes: damageTypes,
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
            damageTypes: damageTypes,
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

function applyResistances(damage: Damage, allAttackTraits: Set<string>, resistances: Resistance[]): void {
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
 * @param damage damage split up by parts
 * @param precisionDamageType type of damage to which it should be added
 * @param splashDamageType type of splash damage that is dealt, needed for swarms, only relevant for weaknesses
 * @param areaDamageType pass in the type of the damage if it originates from a spell cone/line/emanation, needed for swarms, only relevant for weaknesses
 * @param living whether we need to apply positive/negative damage
 * @param alignment whether we need to apply alignment damage
 * @param immunities a list of immunities; one type can be present multiple times, we use the highest one
 * @param weaknesses a list of weaknesses; one type can be present multiple times, we use the highest one
 * @param resistances a list of resistances; one type can be present multiple times, we use the highest one
 * @return the final calculated damage
 */
export function calculateDamage({
    areaDamageType,
    splashDamageType,
    damage,
    living,
    alignment,
    immunities,
    resistances,
    weaknesses,
}: {
    areaDamageType?: DamageType;
    splashDamageType?: DamageType;
    damage: Damage;
    living: Living;
    immunities: Immunity[];
    resistances: Resistance[];
    weaknesses: Weakness[];
    alignment: AlignmentString;
}): number {
    const allAttackTraits = new Set<string>();
    const copiedDamage: Damage = new Map();
    // make a damage copy since we are going to modify the map and objects directly
    Array.from(damage.entries()).forEach(([type, value]) => {
        value.traits.forEach((trait) => allAttackTraits.add(trait));
        copiedDamage.set(type, { ...value, traits: new Set(value.traits) });
    });
    removePositiveOrNegativeDamage(copiedDamage, living);
    removeAlignmentDamage(copiedDamage, alignment);
    applyImmunities(copiedDamage, allAttackTraits, immunities);
    applyWeaknesses({
        damage: copiedDamage,
        allAttackTraits,
        weaknesses,
        splashDamageType,
        areaDamageType,
    });
    applyResistances(copiedDamage, allAttackTraits, resistances);
    return sum(Array.from(copiedDamage.values()).map((value) => value.precision + value.critical + value.normal));
}
