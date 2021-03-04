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

export type AttackTrait =
    | 'area-damage'
    | 'magical'
    | 'adamantine'
    | 'coldiron'
    | 'ghostTouch'
    | 'darkwood'
    | 'mithral'
    | 'silver'
    | 'orichalcum'
    | 'nonlethal attacks'
    | 'vorpal weapons'
    | 'unarmed';

const allAttackTraits = new Set<string>();
allAttackTraits.add('area-damage');
allAttackTraits.add('magical');
allAttackTraits.add('adamantine');
allAttackTraits.add('coldiron');
allAttackTraits.add('ghostTouch');
allAttackTraits.add('darkwood');
allAttackTraits.add('mithral');
allAttackTraits.add('silver');
allAttackTraits.add('orichalcum');
allAttackTraits.add('nonlethal attacks');
allAttackTraits.add('vorpal weapons');
allAttackTraits.add('unarmed');

export function isAttackTrait(trait: string): trait is AttackTrait {
    return allAttackTraits.has(trait);
}

type CombinedTraits =
    | AttackTrait
    | DamageType
    | 'all'
    | 'physical'
    | 'non-magical'
    | 'critical-hits'
    | 'splash-damage'
    | 'precision-damage'
    | 'precision'; // FIXME: different values in config.ts

const allCombinedTraits = new Set<string>([...allAttackTraits, ...allDamageTypes]);
allCombinedTraits.add('all');
allCombinedTraits.add('physical');
allCombinedTraits.add('non-magical');
allCombinedTraits.add('critical-hits');
allCombinedTraits.add('splash-damage');
allCombinedTraits.add('precision-damage');
allCombinedTraits.add('precision');

function isCombinedTrait(trait: string): trait is CombinedTraits {
    return allCombinedTraits.has(trait);
}

export class DamageValues {
    private readonly normal: number;
    private readonly precision: number;
    private readonly critical: number;
    private readonly criticalPrecision;
    private readonly splash: number;
    private readonly traits: Set<AttackTrait>;

    constructor({
        normal = 0,
        precision = 0,
        critical = 0,
        criticalPrecision = 0,
        splash = 0,
        traits,
    }: {
        normal?: number;
        precision?: number;
        critical?: number;
        criticalPrecision?: number;
        splash?: number;
        traits: Set<AttackTrait>;
    }) {
        this.normal = normal;
        this.precision = precision;
        this.critical = critical;
        this.criticalPrecision = criticalPrecision;
        this.splash = splash;
        this.traits = traits;
    }

    sum(): number {
        return this.normal + this.precision + this.critical + this.criticalPrecision + this.splash;
    }

    sumPrecision() {
        return this.precision + this.criticalPrecision;
    }

    sumCritical() {
        return this.critical + this.criticalPrecision;
    }

    sumSplash() {
        return this.splash;
    }

    getTraits() {
        return denormalizeTraits(this.traits);
    }

    withoutCritical() {
        return this.copy({
            critical: 0,
            criticalPrecision: 0,
        });
    }

    withoutPrecision() {
        return this.copy({
            precision: 0,
            criticalPrecision: 0,
        });
    }

    addDamage(value: number): DamageValues {
        return this.copy({ normal: this.normal + value });
    }

    copy({
        normal,
        precision,
        critical,
        criticalPrecision,
        splash,
        traits,
    }: {
        normal?: number;
        precision?: number;
        critical?: number;
        criticalPrecision?: number;
        splash?: number;
        traits?: Set<AttackTrait>;
    }): DamageValues {
        return new DamageValues({
            normal: normal ?? this.normal,
            precision: precision ?? this.precision,
            critical: critical ?? this.critical,
            criticalPrecision: criticalPrecision ?? this.criticalPrecision,
            splash: splash ?? this.splash,
            traits: traits ?? this.traits,
        });
    }
}

export type Damage = Map<DamageType, DamageValues>;

export type DamageExceptions = Set<CombinedTraits>[];

interface HasValue {
    /**
     * Due to the "take the highest one" rule we need to actually figure out how much critical, precision and splash damage
     * resistance would actually reduce
     * @param damage
     * @param damageType
     */
    calculateValue(damage: Damage, damageType: DamageType): number;
}

class Modifier {
    protected exceptions: DamageExceptions;
    protected type: string;

    constructor(exceptions: DamageExceptions, type: string) {
        this.exceptions = exceptions;
        this.type = type;
    }

    /**
     * A single trait or damage combination can disable all resistance/weaknesses/immunities.
     * @param damageTraits all traits applicable for the damage pool
     * @return true if the current exception applies
     */
    exceptionApplies(damageTraits: Set<string>): boolean {
        return this.exceptions.some((traitCombination) =>
            Array.from(traitCombination).every((trait) => {
                return damageTraits.has(trait);
            }),
        );
    }

    getType(): string {
        return this.type;
    }
}

export class Immunity extends Modifier {
    copy({ type, exceptions }: { type?: string; exceptions?: DamageExceptions }): Immunity {
        return new Immunity(exceptions ?? this.exceptions, type ?? this.type);
    }
}

export class Weakness extends Modifier implements HasValue {
    private readonly value: number;

    constructor({ type, value, exceptions }: { type: string; value: number; exceptions: DamageExceptions }) {
        super(exceptions, type);
        this.value = value;
    }

    calculateValue(damage: Damage, damageType: DamageType): number {
        const damageValues = damage.get(damageType);
        // if no damage is dealt, no weakness is triggered
        if (this.type === 'critical-hits') {
            return damageValues.sumCritical() > 0 ? this.value : 0;
        } else if (this.type.startsWith('precision')) {
            return damageValues.sumPrecision() > 0 ? this.value : 0;
        } else if (this.type === 'splash-damage') {
            return damageValues.sumSplash() > 0 ? this.value : 0;
        } else {
            return damageValues.sum() > 0 ? this.value : 0;
        }
    }
}

export class Resistance extends Modifier implements HasValue {
    private readonly value: number;
    private readonly doubleResistanceVsNonMagical: boolean;

    constructor({
        type,
        value,
        doubleResistanceVsNonMagical,
        exceptions,
    }: {
        type: string;
        value: number;
        doubleResistanceVsNonMagical: boolean;
        exceptions: DamageExceptions;
    }) {
        super(exceptions, type);
        this.value = value;
        this.doubleResistanceVsNonMagical = doubleResistanceVsNonMagical;
    }

    calculateValue(damage: Damage, damageType: DamageType): number {
        const damageValues = damage.get(damageType);
        const isNonMagical = getAllAttackTraits(damage).has('non-magical');
        const adjustedValue = this.doubleResistanceVsNonMagical && isNonMagical ? this.value * 2 : this.value;
        if (this.type === 'critical-hits') {
            return Math.min(adjustedValue, damageValues.sumCritical());
        } else if (this.type.startsWith('precision')) {
            return Math.min(adjustedValue, damageValues.sumPrecision());
        } else if (this.type === 'splash-damage') {
            return Math.min(adjustedValue, damageValues.sumSplash());
        } else {
            return adjustedValue;
        }
    }
}

/**
 * Find and add all related traits
 * @param traits
 */
function denormalizeTraits(traits: Set<CombinedTraits>): Set<CombinedTraits> {
    const result: Set<CombinedTraits> = new Set<CombinedTraits>();
    result.add('all');
    if (traits.has('piercing') || traits.has('slashing') || traits.has('bludgeoning')) {
        result.add('physical');
    }
    // Mithral weapons and armor are treated as if they were silver for the purpose of damaging
    // creatures with weakness to silver
    if (traits.has('mithral')) {
        result.add('silver');
    }
    if (!traits.has('magical')) {
        result.add('non-magical');
    }
    for (const trait of traits) {
        result.add(trait);
    }
    return result;
}

/**
 * The except block not only looks at the current attack traits (e.g. piercing adamantine)
 * but also at all other damage traits present for the current attack (e.g. cold, ghostTouch, etc)
 * @param damage
 */
function getAllAttackTraits(damage: Damage): Set<CombinedTraits> {
    const damageTypes = Array.from(damage.keys());
    const damageTraits = Array.from(damage.values()).flatMap((value) => Array.from(value.getTraits()));
    const combined: CombinedTraits[] = [...damageTraits, ...damageTypes];
    return denormalizeTraits(new Set(combined));
}

/**
 * Given a damage type pool, find out which modifiers are relevant by checking their exceptions
 * @return a list of modifiers filtered by their except blocks
 */
function filterModifiers<T extends Modifier>(
    damage: Damage,
    damageType: DamageType,
    modifiersByType: Map<CombinedTraits, T[]>,
): T[] {
    const allAttackTraits = getAllAttackTraits(damage);
    return (
        Array.from(damage.get(damageType).getTraits())
            // calculation for critical hits, precision and splash damage is different since these are
            // part of the actual damage object and need to be capped at their value, e.g.
            // resistance 7 splash damage and 5 splash damage will only reduce 5 total
            // therefore these modifiers will always be looked up if they're present
            .concat('critical-hits', 'precision-damage', 'precision', 'splash-damage')
            .flatMap((trait) => modifiersByType.get(trait) ?? [])
            .filter((modifier) => !modifier.exceptionApplies(allAttackTraits))
    );
}

/**
 * This function is responsible for going through a list of possible modifiers, evaluating them against their
 * exceptions based on the given traits.
 *
 * @return value or undefined if no modifier has been found
 */
function findHighestModifier<T extends Weakness | Resistance>(
    damage: Damage,
    damageType: DamageType,
    modifiersByType: Map<CombinedTraits, T[]>,
): number | undefined {
    return filterModifiers(damage, damageType, modifiersByType)
        .map((modifier) => modifier.calculateValue(damage, damageType))
        .sort((a, b) => a - b) // https://i.redd.it/5ik1hby4ngk61.png
        .reverse()[0];
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

function applyImmunities(damage: Damage, immunities: Immunity[]): void {
    // replace object-immunities with their respective immunities
    const denormalizedImmunities = immunities
        .flatMap((immunity) => {
            if (immunity.getType() === 'object-immunities') {
                return ['bleed', 'poison', 'nonlethal attacks', 'mental'].map((type) => {
                    return immunity.copy({ type });
                });
            } else {
                return [immunity];
            }
        })
        // only keep relevant immunities
        .filter((immunity) => isCombinedTrait(immunity.getType()));

    const modifiersByType = groupBy(
        denormalizedImmunities,
        (immunity: Immunity) => immunity.getType() as CombinedTraits,
    );

    for (const type of Array.from(damage.keys())) {
        let damageValues = damage.get(type);
        const applicableModifiers = filterModifiers(damage, type, modifiersByType);
        applicableModifiers.forEach((modifier) => {
            // there's no splash damage immunity
            if (modifier.getType() === 'critical-hits') {
                damageValues = damageValues.withoutCritical();
            } else if (modifier.getType().startsWith('precision')) {
                damageValues = damageValues.withoutPrecision();
            }
        });
        const isImmune = applicableModifiers.some(
            (immunity) => immunity.getType() !== 'critical-hits' && !immunity.getType().startsWith('precision'),
        );
        if (isImmune) {
            damage.delete(type);
        } else {
            damage.set(type, damageValues);
        }
    }
}

function applyWeaknesses(damage: Damage, weaknesses: Weakness[]): void {
    const usableModifiers = weaknesses.filter((weakness) => isCombinedTrait(weakness.getType()));
    const modifiersByType = groupBy(usableModifiers, (weakness: Weakness) => weakness.getType() as CombinedTraits);

    for (const type of Array.from(damage.keys())) {
        const damageValues = damage.get(type);
        const highestModifier = findHighestModifier(damage, type, modifiersByType);
        if (highestModifier !== undefined) {
            damage.set(type, damageValues.addDamage(highestModifier));
        }
    }
}

function applyResistances(damage: Damage, resistances: Resistance[]): number {
    const usableModifiers = resistances.filter((resistance) => isCombinedTrait(resistance.getType()));
    const modifiersByType = groupBy(
        usableModifiers,
        (resistance: Resistance) => resistance.getType() as CombinedTraits,
    );

    return sum(
        Array.from(damage.keys()).map((type) => {
            const damageValues = damage.get(type);
            const highestModifier = findHighestModifier(damage, type, modifiersByType);
            if (highestModifier === undefined) {
                return damageValues.sum();
            } else {
                return Math.max(0, damageValues.sum() - highestModifier);
            }
        }),
    );
}

/**
 * Implementation of https://2e.aonprd.com/Rules.aspx?ID=342
 * @param damage damage split up by parts
 * @param precisionDamageType type of damage to which it should be added
 * @param living whether we need to apply positive/negative damage
 * @param alignment whether we need to apply alignment damage
 * @param immunities a list of immunities; one type can be present multiple times, we use the highest one
 * @param weaknesses a list of weaknesses; one type can be present multiple times, we use the highest one
 * @param resistances a list of resistances; one type can be present multiple times, we use the highest one
 * @return the final calculated damage
 */
export function calculateDamage({
    damage,
    living,
    alignment,
    immunities,
    resistances,
    weaknesses,
}: {
    damage: Damage;
    living: Living;
    immunities: Immunity[];
    resistances: Resistance[];
    weaknesses: Weakness[];
    alignment: AlignmentString;
}): number {
    // make a damage copy since we are going to modify the map
    const copiedDamage: Damage = new Map();
    Array.from(damage.entries()).forEach(([type, value]) => {
        copiedDamage.set(type, value);
    });
    removePositiveOrNegativeDamage(copiedDamage, living);
    removeAlignmentDamage(copiedDamage, alignment);
    applyImmunities(copiedDamage, immunities);
    applyWeaknesses(copiedDamage, weaknesses);
    return applyResistances(copiedDamage, resistances);
}
