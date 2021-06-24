import { Alignment } from '@actor/creature/data';
import { isChaotic, isEvil, isGood, isLawful } from './alignment';
import { Living } from './living';
import { groupBy, sum } from './utils';

const physicalDamageTypes = ['bludgeoning', 'piercing', 'slashing', 'bleed'] as const;
const lifeEnergyDamageTypes = ['positive', 'negative'] as const;
const energyDamageTypes = ['acid', 'cold', 'electricity', 'fire', 'sonic', 'force', ...lifeEnergyDamageTypes] as const;
const alignmentDamageTypes = ['chaotic', 'lawful', 'good', 'evil'] as const;
const damageTypes = new Set([
    ...physicalDamageTypes,
    ...energyDamageTypes,
    ...alignmentDamageTypes,
    'mental',
    'poison',
] as const);

export type SetElement<SetType extends Set<unknown>> = SetType extends Set<infer ElementType> ? ElementType : never;

export type DamageType = SetElement<typeof damageTypes>;

export function isDamageType(value: string): value is DamageType {
    return damageTypes.has(value as DamageType);
}

const attackTraits = new Set([
    'adamantine',
    'air',
    'area-damage',
    'coldiron',
    'darkwood',
    'earth',
    'fire',
    'ghostTouch',
    'light',
    'magical',
    'mithral',
    'nonlethal attacks', // has to be present on every damage type pool!
    'persistent-damage',
    'salt',
    'salt water',
    'silver',
    'orichalcum',
    'unarmed',
    'vorpal',
    'warpglass',
    'water',
] as const);

export type AttackTrait = SetElement<typeof attackTraits>;

export function isAttackTrait(trait: string): trait is AttackTrait {
    return attackTraits.has(trait as AttackTrait);
}

const combinedTraits = new Set([
    ...attackTraits,
    ...damageTypes,
    'all',
    'physical',
    'non-magical',
    'critical-hits',
    'splash-damage',
    'energy',
    'precision',
] as const);

export type CombinedTrait = SetElement<typeof combinedTraits>;

export function isCombinedTrait(trait: string): trait is CombinedTrait {
    return combinedTraits.has(trait as CombinedTrait);
}

export class DamageValues {
    private readonly normal: number;
    private readonly precision: number;
    private readonly critical: number;
    private readonly criticalPrecision: number;
    private readonly splash: number;
    private readonly traits: Set<AttackTrait>;

    constructor({
        normal = 0,
        precision = 0,
        critical = 0,
        criticalPrecision = 0,
        splash = 0,
        traits = new Set(),
    }: {
        normal?: number;
        precision?: number;
        critical?: number;
        criticalPrecision?: number;
        splash?: number;
        traits?: Set<AttackTrait>;
    } = {}) {
        this.normal = normal;
        this.precision = precision;
        this.critical = critical;
        this.criticalPrecision = criticalPrecision;
        this.splash = splash;
        this.traits = traits;
    }

    total(): number {
        return this.normal + this.precision + this.critical + this.criticalPrecision + this.splash;
    }

    totalPrecision() {
        return this.precision + this.criticalPrecision;
    }

    totalCritical() {
        return this.critical + this.criticalPrecision;
    }

    totalSplash() {
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

    withoutSplash() {
        return this.copy({
            splash: 0,
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

export type DamageExceptions = Set<CombinedTrait>[];

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

    constructor({ exceptions = [], type }: { exceptions?: DamageExceptions; type: string }) {
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
        return new Immunity({ exceptions: exceptions ?? this.exceptions, type: type ?? this.type });
    }
}

export class Weakness extends Modifier implements HasValue {
    private readonly value: number;

    constructor({ type, value, exceptions = [] }: { type: string; value: number; exceptions?: DamageExceptions }) {
        super({ exceptions, type });
        this.value = value;
    }

    calculateValue(damage: Damage, damageType: DamageType): number {
        const damageValues = damage.get(damageType) ?? new DamageValues();
        // if no damage is dealt, no weakness is triggered
        if (this.type === 'critical-hits') {
            return damageValues.totalCritical() > 0 ? this.value : 0;
        } else if (this.type === 'precision') {
            return damageValues.totalPrecision() > 0 ? this.value : 0;
        } else if (this.type === 'splash-damage') {
            return damageValues.totalSplash() > 0 ? this.value : 0;
        } else {
            return damageValues.total() > 0 ? this.value : 0;
        }
    }
}

export class Resistance extends Modifier implements HasValue {
    private readonly value: number;
    private readonly doubleResistanceVsNonMagical: boolean;

    constructor({
        type,
        value,
        doubleResistanceVsNonMagical = false,
        exceptions = [],
    }: {
        type: string;
        value: number;
        doubleResistanceVsNonMagical?: boolean;
        exceptions?: DamageExceptions;
    }) {
        super({ exceptions, type });
        this.value = value;
        this.doubleResistanceVsNonMagical = doubleResistanceVsNonMagical;
    }

    calculateValue(damage: Damage, damageType: DamageType): number {
        const damageValues = damage.get(damageType) ?? new DamageValues();
        const isNonMagical = getAllAttackTraits(damage).has('non-magical');
        const adjustedValue = this.doubleResistanceVsNonMagical && isNonMagical ? this.value * 2 : this.value;
        // calculation for critical hits, precision and splash damage is different since these are
        // part of the actual damage object and need to be capped at their value, e.g.
        // resistance 7 splash damage and 5 splash damage will only reduce 5 total
        // therefore these modifiers will always be looked up if they're present
        if (this.type === 'critical-hits') {
            return Math.min(adjustedValue, damageValues.totalCritical());
        } else if (this.type === 'precision') {
            return Math.min(adjustedValue, damageValues.totalPrecision());
        } else if (this.type === 'splash-damage') {
            return Math.min(adjustedValue, damageValues.totalSplash());
        } else {
            return adjustedValue;
        }
    }

    withReducedValue(reduceBy: number) {
        return new Resistance({
            type: this.type,
            value: Math.max(0, this.value - reduceBy),
            exceptions: this.exceptions,
            doubleResistanceVsNonMagical: this.doubleResistanceVsNonMagical,
        });
    }

    getValue(): number {
        return this.value;
    }
}

/**
 * Find and add all related traits
 * @param traits
 */
function denormalizeTraits(traits: Set<CombinedTrait>): Set<CombinedTrait> {
    const result: Set<CombinedTrait> = new Set();
    result.add('all');
    if ([...physicalDamageTypes].some((damageType) => traits.has(damageType))) {
        result.add('physical');
    }
    if ([...energyDamageTypes].some((damageType) => traits.has(damageType))) {
        result.add('energy');
    }
    if (traits.has('salt water')) {
        result.add('water');
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
function getAllAttackTraits(damage: Damage): Set<CombinedTrait> {
    const damageTypes = Array.from(damage.keys());
    const damageTraits = Array.from(damage.values()).flatMap((value) => Array.from(value.getTraits()));
    const combined: CombinedTrait[] = [...damageTraits, ...damageTypes];
    return denormalizeTraits(new Set(combined));
}

/**
 * Given a damage type pool, find out which modifiers are relevant by checking their exceptions
 * @return a list of modifiers filtered by their except blocks
 */
function filterModifiers<T extends Modifier>(
    damage: Damage,
    damageType: DamageType,
    modifiersByType: Map<CombinedTrait, T[]>,
): T[] {
    const allAttackTraits = getAllAttackTraits(damage);
    const damageTraits: Set<CombinedTrait> = new Set([
        'critical-hits',
        'precision',
        'splash-damage',
        ...denormalizeTraits(new Set([damageType])),
        ...(damage.get(damageType)?.getTraits() ?? new Set<AttackTrait>()),
    ]);
    return Array.from(damageTraits)
        .flatMap((trait) => modifiersByType.get(trait) ?? [])
        .filter((modifier) => !modifier.exceptionApplies(allAttackTraits));
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
    modifiersByType: Map<CombinedTrait, T[]>,
): number | undefined {
    return filterModifiers(damage, damageType, modifiersByType)
        .map((modifier) => modifier.calculateValue(damage, damageType))
        .sort((a, b) => a - b) // https://i.redd.it/5ik1hby4ngk61.png
        .reverse()[0];
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
    const flattenedImmunities = immunities
        .flatMap((immunity) => {
            if (immunity.getType() === 'object-immunities') {
                return ['bleed', 'poison', 'nonlethal attacks', 'mental'].map((type) => {
                    return immunity.copy({ type });
                });
            } else {
                return [immunity];
            }
        })
        .filter((immunity) => isCombinedTrait(immunity.getType()));

    const modifiersByType = groupBy(flattenedImmunities, (immunity: Immunity) => immunity.getType() as CombinedTrait);

    for (const type of Array.from(damage.keys())) {
        let damageValues = damage.get(type)!;
        let isImmune = false;
        const applicableModifiers = filterModifiers(damage, type, modifiersByType);
        for (const modifier of applicableModifiers) {
            if (modifier.getType() === 'critical-hits') {
                damageValues = damageValues.withoutCritical();
            } else if (modifier.getType() === 'precision') {
                damageValues = damageValues.withoutPrecision();
            } else if (modifier.getType() === 'splash-damage') {
                damageValues = damageValues.withoutSplash();
            } else {
                isImmune = true;
            }
        }
        if (isImmune) {
            damage.delete(type);
        } else {
            damage.set(type, damageValues);
        }
    }
}

function applyWeaknesses(damage: Damage, weaknesses: Weakness[]): void {
    const usableModifiers = weaknesses.filter((weakness) => isCombinedTrait(weakness.getType()));
    const modifiersByType = groupBy(usableModifiers, (weakness: Weakness) => weakness.getType() as CombinedTrait);

    for (const type of Array.from(damage.keys())) {
        const damageValues = damage.get(type)!;
        const highestModifier = findHighestModifier(damage, type, modifiersByType);
        if (highestModifier !== undefined) {
            damage.set(type, damageValues.addDamage(highestModifier));
        }
    }
}

function applyResistances(damage: Damage, resistances: Resistance[]): number {
    const usableModifiers = resistances.filter((resistance) => isCombinedTrait(resistance.getType()));
    const modifiersByType = groupBy(usableModifiers, (resistance: Resistance) => resistance.getType() as CombinedTrait);

    return sum(
        Array.from(damage.keys()).map((type) => {
            const damageValues = damage.get(type)!;
            const highestModifier = findHighestModifier(damage, type, modifiersByType);
            if (highestModifier === undefined) {
                return damageValues.total();
            } else {
                return Math.max(0, damageValues.total() - highestModifier);
            }
        }),
    );
}

interface DamageOptions {
    disregardTargetAlignment: boolean;
}

/**
 * Implementation of https://2e.aonprd.com/Rules.aspx?ID=342
 *
 * @param damage damage split up by parts
 * @param immunities a list of immunities; one type can be present multiple times, we use the highest one
 * @param weaknesses a list of weaknesses; one type can be present multiple times, we use the highest one
 * @param resistances a list of resistances; one type can be present multiple times, we use the highest one
 * @param living whether we need to apply positive/negative damage
 * @param alignment whether we need to apply alignment damage
 * @param damageOptions flags for damage calculation
 * @param damageOptions.disregardTargetAlignment if true, will remove the check for the target alignment and always deal alignment damage
 * @return the final calculated damage
 */
export function calculateDamage({
    damage,
    immunities = [],
    resistances = [],
    weaknesses = [],
    living = 'living',
    alignment = 'N',
    damageOptions = {
        disregardTargetAlignment: false,
    },
}: {
    damage: Damage;
    immunities?: Immunity[];
    resistances?: Resistance[];
    weaknesses?: Weakness[];
    living?: Living;
    alignment?: Alignment;
    damageOptions?: DamageOptions;
}): number {
    // make a damage copy since we are going to modify the map
    const copiedDamage: Damage = new Map();
    Array.from(damage.entries()).forEach(([type, value]) => {
        copiedDamage.set(type, value);
    });
    removePositiveOrNegativeDamage(copiedDamage, living);
    if (!damageOptions.disregardTargetAlignment) {
        removeAlignmentDamage(copiedDamage, alignment);
    }
    applyImmunities(copiedDamage, immunities);
    applyWeaknesses(copiedDamage, weaknesses);
    return applyResistances(copiedDamage, resistances);
}

export interface GolemImmunityConstructor {
    slowedRoundsFormula?: string;
    harmedFormula?: string;
    healedFormula?: string;
}

/**
 * A spell can trigger multiple types of damage (e.g. https://2e.aonprd.com/Spells.aspx?ID=32) so there can be more
 * than one result; the formula that should be rolled is damage for harm/heal or rounds for slowed
 */
export class GolemMagicImmunityResult {
    private readonly slowedRoundsFormula?: string;
    private readonly harmedFormula?: string;
    private readonly healedFormula?: string;

    constructor({ slowedRoundsFormula, harmedFormula, healedFormula }: GolemImmunityConstructor = {}) {
        this.slowedRoundsFormula = slowedRoundsFormula;
        this.harmedFormula = harmedFormula;
        this.healedFormula = healedFormula;
    }

    getSlowedRoundsFormula(): string | undefined {
        return this.slowedRoundsFormula;
    }

    getHarmedFormula(): string | undefined {
        return this.harmedFormula;
    }

    getHealedFormula(): string | undefined {
        return this.healedFormula;
    }
}

export interface GolemMagicImmunity {
    healedBy: {
        type: Set<CombinedTrait>;
        formula: string;
    };
    harmedBy: {
        type: Set<CombinedTrait>;
        formula: string;
        areaOrPersistentFormula: string;
    };
    slowedBy: Set<CombinedTrait>;
}

function isTriggeredBy(damageType: DamageType, values: DamageValues, triggeringTraits: Set<CombinedTrait>): boolean {
    return triggeringTraits.has(damageType) || Array.from(triggeringTraits).some((t) => values.getTraits().has(t));
}

/**
 * Only call this function if the damage originated from a spell and the target has golem like magic immunity
 *
 * @param damage dealt spell damage
 * @param immunity golem immunity
 * @return
 */
export function golemAntiMagic(damage: Damage, immunity: GolemMagicImmunity): GolemMagicImmunityResult {
    const result: GolemImmunityConstructor = {};
    for (const [type, damageValues] of damage.entries()) {
        if (isTriggeredBy(type, damageValues, immunity.harmedBy.type)) {
            const traits = damage.get(type)!.getTraits();
            if (traits.has('area-damage') || traits.has('persistent-damage')) {
                result['harmedFormula'] = immunity.harmedBy.areaOrPersistentFormula;
            } else {
                result['harmedFormula'] = immunity.harmedBy.formula;
            }
        } else if (isTriggeredBy(type, damageValues, immunity.healedBy.type)) {
            result['healedFormula'] = immunity.healedBy.formula;
        } else if (isTriggeredBy(type, damageValues, immunity.slowedBy)) {
            result['slowedRoundsFormula'] = '2d6';
        }
    }
    return new GolemMagicImmunityResult(result);
}

export interface ParsedException {
    doubleResistanceVsNonMagical: boolean;
    except: DamageExceptions;
}

/**
 * Used to parse new stat blocks imported from AoN or migrate existing ones
 *
 * This method needs to deal with the following string value crap:
 *
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
export function parseExceptions(exceptions: string | undefined | null): ParsedException {
    if (exceptions === undefined || exceptions === null) {
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
            except: traitCombinations
                .map((traitCombination) => {
                    // assume traits to be separated by space
                    return new Set(
                        traitCombination.split(' ').filter((traitCombination) => isCombinedTrait(traitCombination)),
                    );
                })
                .filter((traits) => traits.size > 0) as DamageExceptions,
        };
    }
}

/**
 * Some feats and spells reduce resistances by a certain value; apply this to resistances before damage calculation
 *
 * @param resistances all resistances
 * @param reductions map of resistance type to reduction value
 */
export function reduceResistances(resistances: Resistance[], reductions: Map<string, number>): Resistance[] {
    return resistances.map((resistance) => {
        const reduceBy = reductions.get(resistance.getType());
        if (reduceBy === undefined) {
            return resistance;
        } else {
            return resistance.withReducedValue(reduceBy);
        }
    });
}
