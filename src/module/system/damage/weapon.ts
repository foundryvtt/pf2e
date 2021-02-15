import {
    PF2DamageDice,
    PF2Modifier,
    PF2ModifierType,
    PF2ModifierPredicate,
    PF2StatisticModifier,
    PROFICIENCY_RANK_OPTION,
} from '../../modifiers';
import { getPropertyRuneModifiers, getStrikingDice, hasGhostTouchRune } from '@item/runes';
import { DamageCategory, DamageDieSize } from './damage';
import { WeaponData } from '@item/data-definitions';
import { AbilityString, ActorDataPF2e, CharacterStrikeTrait } from '@actor/actor-data-definitions';
import { PF2RollNote } from '../../notes';
import { PF2Striking, PF2WeaponPotency } from '../../rules/rules-data-definitions';
import { DegreeOfSuccess, DegreeOfSuccessMultipliers } from '../../degree-of-success';
import { DamagePool } from './damage-pool';
import { DamageEntry } from './damage-entry';

/** Return true if the given damage type is non-null and not physical; false otherwise. */
function isNonPhysicalDamage(damageType?: string): boolean {
    return (
        damageType !== undefined &&
        damageType !== '' &&
        DamageCategory.fromDamageType(damageType) !== DamageCategory.PHYSICAL
    );
}

/**
 * @category PF2
 */
export class PF2WeaponDamage {
    static calculateStrikeNPC(
        weapon,
        actor: ActorDataPF2e,
        traits: CharacterStrikeTrait[] = [],
        statisticsModifiers: Record<string, PF2Modifier[]>,
        damageDice,
        proficiencyRank = 0,
        options: string[] = [],
        rollNotes: Record<string, PF2RollNote[]>,
    ) {
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
                    const dm = new PF2Modifier('Base', modifier, 'untyped');
                    dm.damageType = dmg.damageType;
                    modifiers.push(dm);
                    statisticsModifiers.damage = modifiers;
                }
            } else {
                weapon.data.damage.dice = dice;
                weapon.data.damage.die = die;
                if (weapon.data.range.value !== 'ranged') {
                    modifier -= actor.data.abilities.str.mod;
                }
                weapon.data.damage.modifier = modifier;
                weapon.data.damage.damageType = dmg.damageType;
                parsedBaseDamage = true;
            }
        }

        return PF2WeaponDamage.calculate(
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
        traits: CharacterStrikeTrait[] = [],
        statisticsModifiers: Record<string, PF2Modifier[]>,
        damageDice: Record<string, PF2DamageDice[]>,
        proficiencyRank = -1,
        options: string[] = [],
        rollNotes: Record<string, PF2RollNote[]>,
        weaponPotency: PF2WeaponPotency | null,
        striking: Record<string, PF2Striking[]>,
    ) {
        let effectDice = weapon.data.damage.dice ?? 1;
        const diceModifiers: PF2DamageDice[] = [];
        const numericModifiers: PF2Modifier[] = [];
        let baseDamageDie = <DamageDieSize>weapon.data.damage.die;
        let baseDamageType = weapon.data.damage.damageType;
        options = traits.map((t) => t.name).concat(options); // always add all weapon traits to the options
        if (proficiencyRank >= 0) {
            options.push(PROFICIENCY_RANK_OPTION[proficiencyRank]);
        }

        // determine ability modifier
        let ability: AbilityString;
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
                actor.items.some((i) => i.type === 'feat' && i.name === 'Thief Racket') && // character has Thief Racket class feature
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
                    new PF2Modifier(CONFIG.PF2E.abilities[ability], modifier, PF2ModifierType.ABILITY),
                );
            }
        }
        const selectors: string[] = PF2WeaponDamage.getSelectors(weapon, ability, proficiencyRank);

        // two-hand trait
        const twoHandTrait = traits.find((t) => t.name.toLowerCase().startsWith('two-hand-'));
        if (twoHandTrait && options.some((o) => o === twoHandTrait.rollOption)) {
            baseDamageDie = <DamageDieSize>twoHandTrait.name.substring(twoHandTrait.name.lastIndexOf('-') + 1);
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
            const damageType = weapon.data?.property1?.damageType;
            diceModifiers.push(
                new PF2DamageDice({
                    selector: 'damage',
                    name: 'PF2E.WeaponCustomDamageLabel',
                    diceNumber: normalDice,
                    dieSize: <DamageDieSize>weapon.data?.property1?.die,
                    damageType: damageType,
                    traits: isNonPhysicalDamage(damageType) ? [damageType] : [],
                }),
            );
        }
        const critDice = weapon.data?.property1?.critDice ?? 0;
        if (critDice > 0) {
            const damageType = weapon.data?.property1?.critDamageType;
            diceModifiers.push(
                new PF2DamageDice({
                    selector: 'damage',
                    name: 'PF2E.WeaponCustomDamageLabel',
                    diceNumber: critDice,
                    dieSize: <DamageDieSize>weapon.data?.property1?.critDie,
                    damageType: damageType,
                    multipliers: DegreeOfSuccessMultipliers.criticalOnly(),
                    traits: isNonPhysicalDamage(damageType) ? [damageType] : [],
                }),
            );
        }

        // potency
        const potency = weaponPotency?.bonus ?? 0;

        // striking rune
        let strikingDice = 0;
        {
            const strikingList: PF2Striking[] = [];
            selectors.forEach((key) => {
                (striking[key] ?? [])
                    .filter((wp) => PF2ModifierPredicate.test(wp.predicate, options))
                    .forEach((wp) => strikingList.push(wp));
            });

            // find best striking source
            const strikingRune = getStrikingDice(weapon.data);
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
                    new PF2DamageDice({
                        selector: 'damage',
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
                new PF2DamageDice({
                    selector: 'damage',
                    name: 'PF2E.WeaponPropertyRuneGhostTouch',
                    traits: ['ghostTouch'],
                }),
            );
        }

        // backstabber trait
        if (traits.some((t) => t.name === 'backstabber') && options.includes('target:flatFooted')) {
            const modifier = new PF2Modifier(
                CONFIG.PF2E.weaponTraits.backstabber,
                potency > 2 ? 2 : 1,
                PF2ModifierType.UNTYPED,
            );
            modifier.damageCategory = 'precision';
            numericModifiers.push(modifier);
        }

        // deadly trait
        traits
            .filter((t) => t.name.startsWith('deadly-'))
            .forEach((t) => {
                diceModifiers.push(
                    new PF2DamageDice({
                        selector: 'damage',
                        name: CONFIG.PF2E.weaponTraits[t.name],
                        diceNumber: strikingDice > 1 ? strikingDice : 1,
                        dieSize: <DamageDieSize>t.name.substring(t.name.indexOf('-') + 1),
                        multipliers: DegreeOfSuccessMultipliers.criticalOnly(),
                    }),
                );
            });

        // fatal trait
        traits
            .filter((t) => t.name.startsWith('fatal-'))
            .forEach((t) => {
                const dieSize = <DamageDieSize>t.name.substring(t.name.indexOf('-') + 1);
                diceModifiers.push(
                    new PF2DamageDice({
                        selector: 'damage',
                        name: CONFIG.PF2E.weaponTraits[t.name],
                        diceNumber: 1,
                        dieSize,
                        multipliers: DegreeOfSuccessMultipliers.criticalOnly(),
                        override: { dieSize },
                    }),
                );
            });

        // check for weapon specialization
        const weaponSpecializationDamage = proficiencyRank > 1 ? proficiencyRank : 0;
        if (weaponSpecializationDamage > 0) {
            if (actor.items.some((i) => i.type === 'feat' && i.name.startsWith('Greater Weapon Specialization'))) {
                numericModifiers.push(
                    new PF2Modifier(
                        'PF2E.GreaterWeaponSpecialization',
                        weaponSpecializationDamage * 2,
                        PF2ModifierType.UNTYPED,
                    ),
                );
            } else if (actor.items.some((i) => i.type === 'feat' && i.name.startsWith('Weapon Specialization'))) {
                numericModifiers.push(
                    new PF2Modifier('PF2E.WeaponSpecialization', weaponSpecializationDamage, PF2ModifierType.UNTYPED),
                );
            }
        }

        // add splash damage
        const splashDamage = parseInt(weapon.data?.splashDamage?.value, 10) ?? 0;
        if (splashDamage > 0) {
            numericModifiers.push(
                new PF2Modifier('PF2E.WeaponSplashDamageLabel', splashDamage, PF2ModifierType.UNTYPED),
            );
        }

        // add bonus damage
        const bonusDamage = parseInt(weapon.data?.bonusDamage?.value, 10) ?? 0;
        if (bonusDamage > 0) {
            numericModifiers.push(new PF2Modifier('PF2E.WeaponBonusDamageLabel', bonusDamage, PF2ModifierType.UNTYPED));
        }

        // conditions, custom modifiers, and roll notes
        const notes = [];
        {
            selectors.forEach((key) => {
                const modifiers = statisticsModifiers[key] || [];
                modifiers
                    .map((m) => duplicate(m))
                    .forEach((m) => {
                        const modifier = new PF2Modifier(game.i18n.localize(m.name), m.modifier, m.type);
                        modifier.label = m.label;
                        if (m.damageType) {
                            modifier.damageType = m.damageType;
                        }
                        if (m.damageCategory) {
                            modifier.damageCategory = m.damageCategory;
                        }
                        modifier.ignored = !new PF2ModifierPredicate(m.predicate ?? {}).test(options);
                        numericModifiers.push(modifier);
                    });
                (rollNotes[key] ?? [])
                    .map((note) => duplicate(note))
                    .filter((note) => PF2ModifierPredicate.test(note.predicate, options))
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
            const stats = [];
            stats.push(`${weapon.name.slugify()}-damage`); // convert white spaces to dash and lower-case all letters
            stats.concat([`${weapon._id}-damage`, 'damage']).forEach((key) => {
                (damageDice[key] || [])
                    .map((d) => new PF2DamageDice(d))
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
                (!d.damageType || d.damageType === damage.base.damageType)
            ) {
                d.name += ` ${d.category}`;
            }
            d.label = d.name;
            d.enabled = new PF2ModifierPredicate(d.predicate ?? {}).test(options);
            d.ignored = !d.enabled;
        });

        damage.formula.success = this.getFormula(damage, DegreeOfSuccess.SUCCESS);
        damage.formula.criticalSuccess = this.getFormula(damage, DegreeOfSuccess.CRITICAL_SUCCESS);

        damage.notes = notes;

        return damage;
    }

    /** Convert the damage definition into a final formula, depending on whether the hit is a critical or not. */
    static getFormula(damage, successDegree: DegreeOfSuccess): DamagePool {
        const base = duplicate(damage.base);
        const diceModifiers: PF2DamageDice[] = damage.diceModifiers.filter(
            (dm) => dm.enabled && dm.multipliers[successDegree] > 0,
        );

        // override first, to ensure the dice stacking works properly
        diceModifiers
            .filter((dm) => dm.override)
            .forEach((dm) => {
                base.dieSize = dm.override?.dieSize ?? base.dieSize;
                base.damageType = dm.override?.damageType ?? base.damageType;
            });

        const damagePool: DamagePool = new DamagePool();

        damagePool.entries.push(
            new DamageEntry({
                base: true,
                damageType: base.damageType,
                category: base.category,
                multiplier: DegreeOfSuccessMultipliers.getDefault()[successDegree],
                modifier: base.modifier,
                diceNumber: base.diceNumber,
                dieSize: base.dieSize,
            }),
        );

        // dice modifiers always stack
        diceModifiers.forEach((dm) => {
            damagePool.entries.push(
                new DamageEntry({
                    damageType: dm.damageType ?? base.damageType,
                    category: dm.category,
                    multiplier: dm.multipliers[successDegree],
                    diceNumber: dm.diceNumber,
                    dieSize: dm.dieSize ?? base.dieSize,
                }),
            );

            (dm.traits ?? []).forEach((t) => {
                if (!damage.traits.includes(t)) {
                    damage.traits.push(t);
                }
            });
        });

        // apply stacking rules here and distribute on dice pools
        {
            const modifiers: PF2Modifier[] = damage.numericModifiers.filter(
                (nm) => nm.enabled && nm.multipliers[successDegree] > 0,
            );
            Object.entries(
                modifiers.reduce((accumulator, current) => {
                    // split numeric modifiers into separate lists for each damage type
                    const dmg = current.damageType ?? base.damageType;
                    accumulator[dmg] = (accumulator[dmg] ?? []).concat(current);
                    return accumulator;
                }, {} as Record<string, PF2Modifier[]>),
            )
                .map(([damageType, damageTypeModifiers]) => {
                    // apply stacking rules for numeric modifiers of each damage type separately
                    return new PF2StatisticModifier(`${damageType}-damage-stacking-rules`, damageTypeModifiers)
                        .modifiers;
                })
                .flatMap((nm) => nm)
                .filter((nm) => nm.enabled)
                .forEach((nm) => {
                    damagePool.entries.push(
                        new DamageEntry({
                            damageType: nm.damageType || base.damageType,
                            category: nm.damageCategory,
                            multiplier: nm.multipliers[successDegree],
                            modifier: nm.modifier,
                        }),
                    );

                    (nm.traits ?? [])
                        .filter((t) => !damage.traits.includes(t))
                        .forEach((t) => {
                            damage.traits.push(t);
                        });
                });
        }

        damagePool.data = { effectiveDamageDice: damage.effectDice };

        return damagePool;
    }

    private static getSelectors(weapon: WeaponData, ability: AbilityString, proficiencyRank: number): string[] {
        const selectors = [];
        if (weapon.data?.group?.value) {
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
        return selectors.concat([`${weapon._id}-damage`, 'damage']);
    }
}
