import { ActorDataPF2e } from '@actor/data';
import { AbilityString, StrikeTrait } from '@actor/data/base';
import { WeaponData } from '@item/data';
import { getPropertyRuneModifiers, getStrikingDice, hasGhostTouchRune } from '@item/runes';
import {
    DamageDicePF2e,
    DiceModifierPF2e,
    ModifierPF2e,
    ModifierPredicate,
    MODIFIER_TYPE,
    PROFICIENCY_RANK_OPTION,
    StatisticModifier,
} from '@module/modifiers';
import { RollNotePF2e } from '@module/notes';
import { StrikingPF2e, WeaponPotencyPF2e } from '@module/rules/rules-data-definitions';
import { DamageCategory, DamageDieSize } from './damage';
import { SIZES } from '@module/data';

export interface DamagePartials {
    [damageType: string]: {
        [damageCategory: string]: string;
    };
}

export interface DamageFormula {
    data: object;
    formula: string;
    partials: DamagePartials;
}

export interface DamageTemplate {
    base: {
        damageType: string;
        diceNumber: number;
        dieSize: DamageDieSize;
        modifier: number;
    };
    diceModifiers: DiceModifierPF2e[];
    effectDice: number;
    formula: {
        criticalFailure?: DamageFormula;
        failure?: DamageFormula;
        success: DamageFormula;
        criticalSuccess: DamageFormula;
    };
    name: string;
    notes: RollNotePF2e[];
    numericModifiers: ModifierPF2e[];
    traits: string[];
}

/** A pool of damage dice & modifiers, grouped by damage type. */
export type DamagePool = Record<
    string,
    {
        /** If true, this is the 'base' damage of the weapon or attack; some abilities scale off of base damage dice. */
        base?: boolean;
        categories: {
            [category: string]: {
                /** The static amount of damage of the current damage type and category. */
                modifier?: number;
                /** Maps the die face ('d4', 'd6', 'd8', 'd10', 'd12') to the number of dice of that type. */
                dice?: Record<string, number>;
            };
        };
    }
>;

/** Return true if the given damage type is non-null and not physical; false otherwise. */
function isNonPhysicalDamage(damageType?: string): boolean {
    return (
        damageType !== undefined &&
        damageType !== '' &&
        DamageCategory.fromDamageType(damageType) !== DamageCategory.PHYSICAL
    );
}

export function ensureWeaponCategory(options: string[], weaponCategory: 'simple' | 'martial' | 'advanced' | 'unarmed') {
    if (weaponCategory && !options.some((option) => option.toLowerCase().startsWith('weapon:category:'))) {
        options.push(`weapon:category:${weaponCategory}`);
    }
}

const WEAPON_SIZE_EXPANDED = {
    tiny: 'tiny',
    sm: 'small',
    med: 'medium',
    lg: 'large',
    huge: 'huge',
    grg: 'gargantuan',
} as const;
export function ensureWeaponSize(
    options: string[],
    weaponSize: typeof SIZES[number] | null | undefined,
    wielderSize: typeof SIZES[number] | null | undefined,
) {
    if (weaponSize) {
        if (!options.some((option) => option.toLowerCase().startsWith('weapon:size:'))) {
            options.push(`weapon:size:${WEAPON_SIZE_EXPANDED[weaponSize] ?? weaponSize}`);
        }
        wielderSize = wielderSize === 'sm' ? 'med' : wielderSize; // treat small creatures as medium
        if (wielderSize && SIZES.indexOf(weaponSize) > SIZES.indexOf(wielderSize)) {
            if (!options.some((option) => option.toLowerCase().startsWith('weapon:oversized'))) {
                options.push('weapon:oversized');
            }
            if (!options.some((option) => option.toLowerCase().startsWith('oversized'))) {
                options.push('oversized'); // transitional value until Giant Instinct has been adapted
            }
        }
    }
}

/**
 * @category PF2
 */
export class WeaponDamagePF2e {
    static calculateStrikeNPC(
        weapon: any,
        actor: ActorDataPF2e,
        traits: StrikeTrait[] = [],
        statisticsModifiers: Record<string, ModifierPF2e[]>,
        damageDice: any,
        proficiencyRank = 0,
        options: string[] = [],
        rollNotes: Record<string, RollNotePF2e[]>,
    ): DamageTemplate {
        damageDice = duplicate(damageDice);

        // adapt weapon type (melee, ranged, thrown)
        if (!weapon.data.range) {
            weapon.data.range = {
                value: weapon.data?.weaponType?.value === 'ranged' ? 'ranged' : 'melee',
            };
        }

        // ensure the base damage object exists
        weapon.data.damage = weapon.data.damage ?? {};

        const damageRolls = Array.isArray(weapon.data.damageRolls)
            ? weapon.data.damageRolls
            : Object.values(weapon.data.damageRolls);
        let parsedBaseDamage = false;
        for (const dmg of damageRolls) {
            let dice: number | null = null;
            let die: string | null = null;
            let modifier = 0;
            const parts = dmg.damage.split('');
            let digits = '';
            let operator = null;
            for (const part of parts) {
                if (part === 'd') {
                    dice = Number(digits);
                    digits = '';
                } else if ('+-'.includes(part)) {
                    if (operator) {
                        // deal with the previous flat modifier part
                        if (operator === '-') {
                            modifier -= Number(digits);
                        } else if (operator === '+') {
                            modifier += Number(digits);
                        }
                    } else {
                        die = `d${digits}`;
                    }
                    digits = '';
                    operator = part;
                } else if (!Number.isNaN(Number(part))) {
                    digits += part;
                }
            }
            if (dice && !die) {
                die = `d${digits}`;
            } else if (operator === '-') {
                modifier -= Number(digits);
            } else {
                modifier += Number(digits);
            }

            if (parsedBaseDamage) {
                // amend damage dice with any extra dice
                if (dice && die) {
                    const dd = damageDice.damage ?? [];
                    dd.push({
                        selector: 'damage',
                        name: 'Base',
                        diceNumber: dice,
                        dieSize: die,
                        damageType: dmg.damageType,
                    });
                    damageDice.damage = dd;
                }
                // amend numeric modifiers with any flat modifier
                if (modifier) {
                    const modifiers = statisticsModifiers.damage ?? [];
                    const dm = new ModifierPF2e('Base', modifier, 'untyped');
                    dm.damageType = dmg.damageType;
                    modifiers.push(dm);
                    statisticsModifiers.damage = modifiers;
                }
            } else {
                weapon.data.damage.dice = dice || 0;
                weapon.data.damage.die = die || '';
                if (weapon.data.range.value !== 'ranged' || traits.some((trait) => trait.name.startsWith('thrown'))) {
                    modifier -= actor.data.abilities.str.mod;
                }
                weapon.data.damage.modifier = modifier;
                weapon.data.damage.damageType = dmg.damageType;
                parsedBaseDamage = true;
            }
        }

        return WeaponDamagePF2e.calculate(
            weapon,
            actor,
            traits,
            statisticsModifiers,
            damageDice,
            proficiencyRank,
            options,
            rollNotes,
            null,
            {},
        );
    }

    static calculate(
        weapon: WeaponData,
        actor: ActorDataPF2e,
        traits: StrikeTrait[] = [],
        statisticsModifiers: Record<string, ModifierPF2e[]>,
        damageDice: Record<string, DamageDicePF2e[]>,
        proficiencyRank = -1,
        options: string[] = [],
        rollNotes: Record<string, RollNotePF2e[]>,
        weaponPotency: WeaponPotencyPF2e | null,
        striking: Record<string, StrikingPF2e[]>,
    ): DamageTemplate {
        let effectDice = weapon.data.damage.dice ?? 1;
        const diceModifiers: DiceModifierPF2e[] = [];
        const numericModifiers: ModifierPF2e[] = [];
        let baseDamageDie = weapon.data.damage.die as DamageDieSize;
        let baseDamageType = weapon.data.damage.damageType;
        options = traits
            .filter((trait) => !trait.toggle)
            .map((t) => t.name)
            .concat(options); // always add all weapon traits to the options

        if (proficiencyRank >= 0) {
            options.push(PROFICIENCY_RANK_OPTION[proficiencyRank]);
        }

        // determine ability modifier
        let ability: AbilityString | null = null;
        {
            let modifier = 0;
            const melee =
                ['melee', 'reach', ''].includes(weapon.data?.range?.value?.trim()) ||
                traits.some((t) => t.name.startsWith('thrown'));
            if (melee) {
                ability = 'str';
                modifier = Math.floor((actor.data.abilities.str.value - 10) / 2);
                options.push('melee');
            } else {
                options.push('ranged');
            }

            if (traits.some((t) => t.name === 'propulsive')) {
                ability = 'str';
                const strengthModifier = Math.floor((actor.data.abilities.str.value - 10) / 2);
                modifier = strengthModifier < 0 ? strengthModifier : Math.floor(strengthModifier / 2);
            }

            // check for Rogue's Racket: Thief
            if (
                // character has Thief Racket class feature
                actor.items.some((item) => item.type === 'feat' && item.slug === 'thief-racket') &&
                !traits.some((t) => t.name === 'unarmed') && // NOT unarmed attack
                traits.some((t) => t.name === 'finesse') &&
                melee && // finesse melee weapon
                Math.floor((actor.data.abilities.dex.value - 10) / 2) > modifier // dex bonus higher than the current bonus
            ) {
                ability = 'dex';
                modifier = Math.floor((actor.data.abilities.dex.value - 10) / 2);
            }

            if (ability) {
                numericModifiers.push(
                    new ModifierPF2e(CONFIG.PF2E.abilities[ability], modifier, MODIFIER_TYPE.ABILITY),
                );
            }
        }
        const selectors: string[] = WeaponDamagePF2e.getSelectors(weapon, ability, proficiencyRank);

        // two-hand trait
        const twoHandTrait = traits.find((t) => t.name.toLowerCase().startsWith('two-hand-'));
        if (twoHandTrait && options.some((o) => o === twoHandTrait.rollOption)) {
            baseDamageDie = twoHandTrait.name.substring(twoHandTrait.name.lastIndexOf('-') + 1) as DamageDieSize;
        }

        // versatile trait
        const versatileTrait = traits.find((t) => t.name.toLowerCase().startsWith('versatile-'));
        if (versatileTrait && options.some((o) => o === versatileTrait.rollOption)) {
            const dmg = {
                b: 'bludgeoning',
                p: 'piercing',
                s: 'slashing',
            };
            baseDamageType = dmg[versatileTrait.name.substring(versatileTrait.name.lastIndexOf('-') + 1)];
        }

        // custom damage
        const normalDice = weapon.data?.property1?.dice ?? 0;
        if (normalDice > 0) {
            const damageType = weapon.data?.property1?.damageType ?? baseDamageType;
            diceModifiers.push(
                new DiceModifierPF2e({
                    name: 'PF2E.WeaponCustomDamageLabel',
                    diceNumber: normalDice,
                    dieSize: weapon.data?.property1?.die as DamageDieSize,
                    damageType: damageType,
                    traits: isNonPhysicalDamage(damageType) ? [damageType] : [],
                }),
            );
        }
        const critDice = weapon.data?.property1?.critDice ?? 0;
        if (critDice > 0) {
            const damageType = weapon.data?.property1?.critDamageType ?? baseDamageType;
            diceModifiers.push(
                new DiceModifierPF2e({
                    name: 'PF2E.WeaponCustomDamageLabel',
                    diceNumber: critDice,
                    dieSize: weapon.data?.property1?.critDie as DamageDieSize,
                    damageType: damageType,
                    critical: true,
                    traits: isNonPhysicalDamage(damageType) ? [damageType] : [],
                }),
            );
        }

        // potency
        const potency = weaponPotency?.bonus ?? 0;

        // striking rune
        let strikingDice = 0;
        {
            const strikingList: StrikingPF2e[] = [];
            selectors.forEach((key) => {
                (striking[key] ?? [])
                    .filter((wp) => ModifierPredicate.test(wp.predicate, options))
                    .forEach((wp) => strikingList.push(wp));
            });

            // find best striking source
            const strikingRune = weapon.type === 'weapon' ? getStrikingDice(weapon.data) : null;
            if (strikingRune) {
                strikingList.push({ label: 'PF2E.StrikingRuneLabel', bonus: strikingRune });
            }
            if (strikingList.length > 0) {
                const s = strikingList.reduce(
                    (highest, current) => (highest.bonus > current.bonus ? highest : current),
                    strikingList[0],
                );
                effectDice += s.bonus;
                strikingDice = s.bonus;
                diceModifiers.push(
                    new DiceModifierPF2e({
                        name: s.label,
                        diceNumber: s.bonus,
                        traits: ['magical'],
                    }),
                );
            }
        }

        getPropertyRuneModifiers(weapon).forEach((modifier) => diceModifiers.push(modifier));

        // ghost touch
        if (hasGhostTouchRune(weapon)) {
            diceModifiers.push(
                new DiceModifierPF2e({
                    name: 'PF2E.WeaponPropertyRuneGhostTouch',
                    traits: ['ghostTouch'],
                }),
            );
        }

        // backstabber trait
        if (traits.some((t) => t.name === 'backstabber') && options.includes('target:flatFooted')) {
            const modifier = new ModifierPF2e(
                CONFIG.PF2E.weaponTraits.backstabber,
                potency > 2 ? 2 : 1,
                MODIFIER_TYPE.UNTYPED,
            );
            modifier.damageCategory = 'precision';
            numericModifiers.push(modifier);
        }

        // deadly trait
        traits
            .filter((t) => t.name.startsWith('deadly-'))
            .forEach((t) => {
                const deadly = t.name.substring(t.name.indexOf('-') + 1);
                const diceNumber = (() => {
                    if (deadly.match(/\d+d\d+/)) {
                        return parseInt(deadly.substring(0, deadly.indexOf('d')), 10);
                    } else {
                        return strikingDice > 1 ? strikingDice : 1;
                    }
                })();
                diceModifiers.push(
                    new DiceModifierPF2e({
                        name: CONFIG.PF2E.weaponTraits[t.name],
                        diceNumber,
                        dieSize: deadly.substring(deadly.indexOf('d')) as DamageDieSize,
                        critical: true,
                    }),
                );
            });

        // fatal trait
        traits
            .filter((t) => t.name.startsWith('fatal-'))
            .forEach((t) => {
                const dieSize = t.name.substring(t.name.indexOf('-') + 1) as DamageDieSize;
                diceModifiers.push(
                    new DiceModifierPF2e({
                        name: CONFIG.PF2E.weaponTraits[t.name],
                        diceNumber: 1,
                        dieSize,
                        critical: true,
                        enabled: true,
                        override: { dieSize },
                    }),
                );
            });

        // check for weapon specialization
        const weaponSpecializationDamage = proficiencyRank > 1 ? proficiencyRank : 0;
        if (weaponSpecializationDamage > 0) {
            const has = (slug: string, name: string) =>
                actor.items.some(
                    (item) => item.type === 'feat' && (item.slug?.startsWith(slug) || item.name.startsWith(name)),
                );
            if (has('greater-weapon-specialization', 'Greater Weapon Specialization')) {
                numericModifiers.push(
                    new ModifierPF2e(
                        'PF2E.GreaterWeaponSpecialization',
                        weaponSpecializationDamage * 2,
                        MODIFIER_TYPE.UNTYPED,
                    ),
                );
            } else if (has('weapon-specialization', 'Weapon Specialization')) {
                numericModifiers.push(
                    new ModifierPF2e('PF2E.WeaponSpecialization', weaponSpecializationDamage, MODIFIER_TYPE.UNTYPED),
                );
            }
        }

        // add splash damage
        const splashDamage = Number(weapon.data.splashDamage?.value) || 0;
        if (splashDamage > 0) {
            numericModifiers.push(
                new ModifierPF2e('PF2E.WeaponSplashDamageLabel', splashDamage, MODIFIER_TYPE.UNTYPED),
            );
        }

        // add bonus damage
        const bonusDamage = Number(weapon.data.bonusDamage?.value) || 0;
        if (bonusDamage > 0) {
            numericModifiers.push(new ModifierPF2e('PF2E.WeaponBonusDamageLabel', bonusDamage, MODIFIER_TYPE.UNTYPED));
        }

        // conditions, custom modifiers, and roll notes
        const notes: RollNotePF2e[] = [];
        {
            selectors.forEach((key) => {
                const modifiers = statisticsModifiers[key] || [];
                modifiers
                    .map((m) => duplicate(m))
                    .forEach((m) => {
                        const modifier = new ModifierPF2e(game.i18n.localize(m.name), m.modifier, m.type);
                        modifier.label = m.label;
                        if (m.damageType) {
                            modifier.damageType = m.damageType;
                        }
                        if (m.damageCategory) {
                            modifier.damageCategory = m.damageCategory;
                        }
                        modifier.ignored = !new ModifierPredicate(m.predicate ?? {}).test(options);
                        numericModifiers.push(modifier);
                    });
                (rollNotes[key] ?? [])
                    .map((note) => duplicate(note))
                    .filter((note) => ModifierPredicate.test(note.predicate, options))
                    .forEach((note) => notes.push(note));
            });
        }

        const damage: any = {
            name: `Damage Roll: ${weapon.name}`,
            base: {
                diceNumber: weapon.data.damage.dice,
                dieSize: baseDamageDie,
                modifier: weapon.data.damage.modifier,
                category: DamageCategory.fromDamageType(baseDamageType),
                damageType: baseDamageType,
                traits: [],
            },
            // CRB p. 279, Counting Damage Dice: Effects based on a weapon's number of damage dice include
            // only the weapon's damage die plus any extra dice from a striking rune. They don't count
            // extra dice from abilities, critical specialization effects, property runes, weapon traits,
            // or the like.
            effectDice,
            diceModifiers,
            numericModifiers,
            // the below fields are calculated
            traits: (traits ?? []).map((t) => t.name),
            formula: {},
        };

        // custom dice
        {
            const stats: string[] = [];
            stats.push(`${weapon.name.slugify()}-damage`); // convert white spaces to dash and lower-case all letters
            if (weapon.data.baseItem && !stats.includes(`${weapon.data.baseItem}-damage`)) {
                stats.push(`${weapon.data.baseItem}-damage`);
            }
            stats.concat([`${weapon._id}-damage`, 'damage']).forEach((key) => {
                (damageDice[key] || [])
                    .map((d) => new DamageDicePF2e(d))
                    .forEach((d) => {
                        d.enabled = d.predicate.test(options);
                        diceModifiers.push(d);
                    });
            });
        }

        // include dice number and size in damage tag
        diceModifiers.forEach((d) => {
            d.name = game.i18n.localize(d.name);
            if (d.diceNumber > 0 && d.dieSize) {
                d.name += ` +${d.diceNumber}${d.dieSize}`;
            } else if (d.diceNumber > 0) {
                d.name += ` +${d.diceNumber}${damage.base.dieSize}`;
            } else if (d.dieSize) {
                d.name += ` ${d.dieSize}`;
            }
            if (
                d.category &&
                (d.diceNumber > 0 || d.dieSize) &&
                (!d.damageType || (d.damageType === damage.base.damageType && d.category !== damage.base.category))
            ) {
                d.name += ` ${d.category}`;
            }
            d.label = d.name;
            d.enabled = new ModifierPredicate(d.predicate ?? {}).test(options);
            d.ignored = !d.enabled;
        });

        damage.formula.success = this.getFormula(damage, false);
        damage.formula.criticalSuccess = this.getFormula(damage, true);

        damage.notes = notes;

        return damage;
    }

    /** Convert the damage definition into a final formula, depending on whether the hit is a critical or not. */
    static getFormula(damage: any, critical: boolean): DamageFormula {
        const base = duplicate(damage.base);
        const diceModifiers: DiceModifierPF2e[] = damage.diceModifiers;

        // override first, to ensure the dice stacking works properly
        diceModifiers
            .filter((dm) => dm.enabled)
            .filter((dm) => dm.override)
            .forEach((dm) => {
                if (critical && dm.critical) {
                    base.dieSize = dm.override?.dieSize ?? base.dieSize;
                    base.damageType = dm.override?.damageType ?? base.damageType;
                } else if (!dm.critical) {
                    base.dieSize = dm.override?.dieSize ?? base.dieSize;
                    base.damageType = dm.override?.damageType ?? base.damageType;
                }
            });

        const dicePool: DamagePool = {};
        const critPool: DamagePool = {};
        dicePool[base.damageType] = {
            base: true,
            categories: {
                [base.category ?? DamageCategory.fromDamageType(base.damageType)]: {
                    dice: { [base.dieSize]: base.diceNumber },
                    modifier: base.modifier ?? 0,
                },
            },
        };

        // dice modifiers always stack
        diceModifiers
            .filter((dm) => dm.enabled)
            .filter((dm) => !dm.critical || critical)
            .forEach((dm) => {
                if (critical && dm.critical) {
                    // critical-only stuff
                    if (dm.diceNumber) {
                        this.addDice(
                            critPool,
                            dm.damageType ?? base.damageType,
                            dm.category,
                            dm.dieSize ?? base.dieSize,
                            dm.diceNumber,
                        );
                    }
                    (dm.traits ?? []).forEach((t) => {
                        if (!damage.traits.includes(t)) {
                            damage.traits.push(t);
                        }
                    });
                } else if (!dm.critical) {
                    // regular pool
                    if (dm.diceNumber) {
                        this.addDice(
                            dicePool,
                            dm.damageType ?? base.damageType,
                            dm.category,
                            dm.dieSize ?? base.dieSize,
                            dm.diceNumber,
                        );
                    }
                    (dm.traits ?? []).forEach((t) => {
                        if (!damage.traits.includes(t)) {
                            damage.traits.push(t);
                        }
                    });
                } else {
                    // skip
                }
            });

        // apply stacking rules here and distribute on dice pools
        {
            const modifiers: ModifierPF2e[] = [];
            damage.numericModifiers
                .filter((nm: ModifierPF2e) => nm.enabled && (!nm.critical || critical))
                .forEach((nm: ModifierPF2e) => {
                    if (critical && nm.critical) {
                        // critical-only stuff
                        modifiers.push(nm);
                    } else if (!nm.critical) {
                        // regular pool
                        modifiers.push(nm);
                    } else {
                        // skip
                    }
                });
            Object.entries(
                modifiers.reduce((accumulator: Record<string, ModifierPF2e[]>, current) => {
                    // split numeric modifiers into separate lists for each damage type
                    const dmg = current.damageType ?? base.damageType;
                    accumulator[dmg] = (accumulator[dmg] ?? []).concat(current);
                    return accumulator;
                }, {}),
            )
                .map(([damageType, damageTypeModifiers]) => {
                    // apply stacking rules for numeric modifiers of each damage type separately
                    return new StatisticModifier(`${damageType}-damage-stacking-rules`, damageTypeModifiers).modifiers;
                })
                .flatMap((nm) => nm)
                .filter((nm) => nm.enabled)
                .filter((nm) => !nm.critical || critical)
                .forEach((nm) => {
                    const damageType = nm.damageType ?? base.damageType;
                    let pool = dicePool[damageType];
                    if (!pool) {
                        pool = { categories: {} };
                        dicePool[damageType] = pool;
                    }
                    let category = pool.categories[nm.damageCategory ?? DamageCategory.fromDamageType(damageType)];
                    if (!category) {
                        category = {};
                        pool.categories[nm.damageCategory ?? DamageCategory.fromDamageType(damageType)] = category;
                    }
                    category.modifier = (category.modifier ?? 0) + nm.modifier;
                    (nm.traits ?? [])
                        .filter((t) => !damage.traits.includes(t))
                        .forEach((t) => {
                            damage.traits.push(t);
                        });
                });
        }

        // build formula
        const partials: DamagePartials = {};
        let formula = this.buildFormula(dicePool, partials);
        if (critical) {
            formula = this.doubleFormula(formula);
            for (const [damageType, categories] of Object.entries(partials)) {
                for (const [damageCategory, f] of Object.entries(categories)) {
                    partials[damageType][damageCategory] = this.doubleFormula(f);
                }
            }
            const critFormula = this.buildFormula(critPool, partials);
            if (critFormula) {
                formula += ` + ${critFormula}`;
            }
        }

        return {
            formula,
            partials,
            data: {
                effectiveDamageDice: damage.effectDice,
            },
        };
    }

    /** Add dice to the given damage pool. */
    public static addDice(
        pool: DamagePool,
        damageType: string,
        category: string | undefined,
        dieSize: string,
        count: number,
    ): DamagePool {
        // Ensure that the damage pool for this given damage type exists...
        pool[damageType] = pool[damageType] || { categories: {} };
        const damagePool = pool[damageType];

        // Ensure that the damage category sub-pool for this given damage category exists...
        damagePool.categories[category ?? DamageCategory.fromDamageType(damageType)] =
            damagePool.categories[category ?? DamageCategory.fromDamageType(damageType)] || {};
        const damageCategory = damagePool.categories[category ?? DamageCategory.fromDamageType(damageType)];

        // And then add the given number of dice of the given size.
        damageCategory.dice = damageCategory.dice || {};
        damageCategory.dice[dieSize] = (damageCategory.dice[dieSize] ?? 0) + count;
        return pool;
    }

    /** Converts a damage pool to a final string formula. */
    public static buildFormula(
        pool: DamagePool,
        partials: { [damageType: string]: { [damageCategory: string]: string } } = {},
    ): string {
        // First collect all of the individual components of the pool into one flattened list...
        const parts: string[] = [];
        let minValue = 0;
        for (const [type, cats] of Object.entries(pool)) {
            for (const [category, info] of Object.entries(cats.categories)) {
                const p: string[] = [];
                // Add all of the dice components; each individual dice adds one to the minimum value.
                for (const [dieSize, count] of Object.entries(info.dice ?? {})) {
                    minValue += count;
                    parts.push(`${count}${dieSize}`);
                    p.push(`${count}${dieSize}`);
                }

                // Add the modifier if present.
                if (info.modifier) {
                    minValue += info.modifier;
                    parts.push(info.modifier.toString());
                    p.push(info.modifier.toString());
                }

                partials[type] = partials[type] ?? {};
                let formula = partials[type][category];
                let offset = 0;
                if (!formula) {
                    formula = p[0];
                    offset = 1;
                }
                partials[type][category] = [formula]
                    .concat(
                        p.slice(offset).flatMap((part) => {
                            if (part.startsWith('-')) {
                                return ['-', part.substring(1)];
                            } else {
                                return ['+', part];
                            }
                        }),
                    )
                    .join(' ');
            }
        }

        // To avoid out-of-bounds exceptions, short-circuit with the empty string if there are no damage components whatsoever.
        if (parts.length === 0) {
            return '';
        }

        // Then correct signs (adding '+' or '-' as appropriate) and join; don't modify the first component.
        const formula = [parts[0]]
            .concat(
                parts.slice(1).flatMap((part) => {
                    if (part.startsWith('-')) {
                        return ['-', part.substring(1)];
                    } else {
                        return ['+', part];
                    }
                }),
            )
            .join(' ');

        // Finally, if the minimum formula value can be 0 or lower, lower bound it.
        if (minValue <= 0) {
            return `{${formula}, 1}kh`;
        } else {
            return formula;
        }
    }

    /** Double a textual formula based on the current crit rules. */
    static doubleFormula(formula: string): string {
        const rule = game.settings.get('pf2e', 'critRule');
        if (rule === 'doubledamage') {
            return `2 * (${formula})`;
        } else {
            const critRoll = new Roll(formula).alter(2, 0, { multiplyNumeric: true });
            return critRoll.formula;
        }
    }

    private static getSelectors(weapon: WeaponData, ability: AbilityString | null, proficiencyRank: number): string[] {
        const selectors: string[] = [];
        if (weapon.data.group?.value) {
            selectors.push(`${weapon.data.group.value.toLowerCase()}-weapon-group-damage`);
        }
        if (ability) {
            selectors.push(`${ability}-damage`);
        }
        if (proficiencyRank >= 0) {
            const proficiencies = ['untrained', 'trained', 'expert', 'master', 'legendary'];
            selectors.push(`${proficiencies[proficiencyRank]}-damage`);
        }
        selectors.push(`${weapon.name.slugify()}-damage`); // convert white spaces to dash and lower-case all letters
        return selectors.concat([`${weapon._id}-damage`, 'mundane-damage', 'damage']);
    }
}
