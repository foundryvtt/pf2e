/* global Roll */
import {
    PF2DamageDice,
    PF2Modifier,
    PF2ModifierType,
    PF2StatisticModifier,
} from '../../modifiers';
import {getPropertyRuneModifiers, getStrikingDice, hasGhostTouchRune} from '../../item/runes';
import {DamageCategory} from './damage';

/** A pool of damage dice & modifiers, grouped by damage type. */
export type DamagePool = Record<string, {
    /** The static amount of damage of the current damage type. */
    modifier?: number,
    /** If true, this is the 'base' damage of the weapon or attack; some abilities scale off of base damage dice. */
    base?: boolean,
    /** Maps the die face ('d4', 'd6', 'd8', 'd10', 'd12') to the number of dice of that type. */
    dice?: Record<string, number>
}>;

/** Return true if the given damage type is non-null and not physical; false otherwise. */
function isNonPhysicalDamage(damageType?: string): boolean {
    return DamageCategory.fromDamageType(damageType) !== DamageCategory.PHYSICAL
        && damageType !== undefined
        && damageType !== '';
}

/**
 * @category PF2
 */
export class PF2WeaponDamage {

    static calculate(weapon, actor, traits = [], statisticsModifiers: Record<string, PF2Modifier[]>, damageDice: Record<string, PF2DamageDice[]>, proficiencyRank = 0, options: string[] = []) {
        let effectDice = weapon.data.damage.dice ?? 1;
        let diceModifiers: PF2DamageDice[] = [];
        let numericModifiers: PF2Modifier[] = [];
        const baseTraits = [];
        let baseDamageDie = weapon.data.damage.die;
        let baseDamageType = weapon.data.damage.damageType;

        // two-hand trait
        const twoHandTrait = traits.find((t) => t.name.toLowerCase().startsWith('two-hand-'));
        if (twoHandTrait && options.some((o) => o === twoHandTrait.rollOption)) {
            baseDamageDie = twoHandTrait.name.substring(twoHandTrait.name.lastIndexOf('-') + 1);
            baseTraits.push(twoHandTrait.name);
        }

        // versatile trait
        const versatileTrait = traits.find((t) => t.name.toLowerCase().startsWith('versatile-'));
        if (versatileTrait && options.some((o) => o === versatileTrait.rollOption)) {
            const dmg = {
                b: 'bludgeoning',
                p: 'piercing',
                s: 'slashing'
            };
            baseDamageType = dmg[versatileTrait.name.substring(versatileTrait.name.lastIndexOf('-') + 1)];
            baseTraits.push(versatileTrait.name);
        }

        // custom damage
        const normalDice = weapon.data?.property1?.dice ?? 0;
        const weaponDamageType = baseDamageType
        if (normalDice > 0) {
            const damageType = weapon.data?.property1?.damageType ?? weaponDamageType;
            diceModifiers.push(new PF2DamageDice({
                name: 'PF2E.WeaponCustomDamageLabel',
                diceNumber: normalDice,
                dieSize: weapon.data?.property1?.die,
                damageType: damageType ?? weaponDamageType,
                traits: isNonPhysicalDamage(damageType) ? [damageType] : [],
            }));
        }
        const critDice = weapon.data?.property1?.critDice ?? 0;
        if (critDice > 0) {
            const damageType = weapon.data?.property1?.critDamageType ?? weaponDamageType;
            diceModifiers.push(new PF2DamageDice({
                name: 'PF2E.WeaponCustomDamageLabel',
                diceNumber: critDice,
                dieSize: weapon.data?.property1?.critDie,
                damageType: damageType ?? weaponDamageType,
                critical: true,
                traits: isNonPhysicalDamage(damageType) ? [damageType] : [],
            }));
        }
        
        // striking rune
        const strikingDice = getStrikingDice(weapon.data);
        if (strikingDice > 0) {
            effectDice += strikingDice;
            diceModifiers.push(new PF2DamageDice({
                name: CONFIG.PF2E.weaponStrikingRunes[weapon.data.strikingRune.value],
                diceNumber: strikingDice,
                traits: ['magical'],
            }));
        }

        getPropertyRuneModifiers(weapon)
            .forEach((modifier) => diceModifiers.push(modifier));
        
        if (weapon.name === 'Cinderclaw Gauntlet') {
            diceModifiers.push(new PF2DamageDice({
                name: weapon.name,
                diceNumber: 1,
                dieSize: 'd6',
                damageType: 'fire',
                critical: true,
                traits: ['fire'],
            }));
        }
        
        // mystic strikes
        if (actor.items.some(i => i.type === 'feat' && i.name === 'Mystic Strikes')
            && traits.some(t => t.name.startsWith('unarmed'))
        ) {
            diceModifiers.push(new PF2DamageDice({
                name: 'PF2E.MysticStrikes',
                traits: ['magical'],
                predicate: {
                    not: ['suppress-mystic-strike'],
                },
            }));
        }

        if (actor.items.some(i => i.type === 'feat' && i.name === 'Metal Strikes')
            && traits.some(t => t.name.startsWith('unarmed'))
        ) {
            diceModifiers.push(new PF2DamageDice({
                name: 'PF2E.MetalStrikes',
                traits: ['silver', 'coldiron'],
                predicate: {
                    not: ['suppress-metal-strike'],
                },
            }));
        }

        if (actor.items.some(i => i.type === 'feat' && i.name === 'Adamantine Strikes')
            && traits.some(t => t.name.startsWith('unarmed'))
        ) {
            diceModifiers.push(new PF2DamageDice({
                name: 'PF2E.AdamantineStrikes',
                traits: ['adamantine'],
                predicate: {
                    not: ['suppress-adamantine-strike'],
                },
            }));
        }

        // ghost touch
        if (hasGhostTouchRune(weapon)) {
            diceModifiers.push(new PF2DamageDice({
                name: 'PF2E.WeaponPropertyRuneGhostTouch',
                traits: ['ghostTouch'],
            }));
        }

        // deadly trait
        traits.filter(t => t.name.startsWith('deadly-')).forEach(t => {
            diceModifiers.push(new PF2DamageDice({
                name: CONFIG.weaponTraits[t.name],
                diceNumber: strikingDice > 1 ? strikingDice : 1,
                dieSize: t.name.substring(t.name.indexOf('-') + 1),
                critical: true,
            }));
        });

        // fatal trait
        traits.filter(t => t.name.startsWith('fatal-')).forEach(t => {
            const dieSize = t.name.substring(t.name.indexOf('-') + 1);
            diceModifiers.push(new PF2DamageDice({
                name: CONFIG.weaponTraits[t.name],
                diceNumber: 1,
                dieSize,
                critical: true,
                override: {dieSize},
            }));
        });

        // determine ability modifier
        let ability;
        {
            let modifier;
            const melee = ['melee', 'reach', ''].includes(weapon.data?.range?.value?.trim()) || traits.some(t => t.name.startsWith('thrown'));
            if (melee) {
                ability = 'str';
                modifier = Math.floor((actor.data.abilities.str.value - 10) / 2);
                options.push('melee')
            } else {
                options.push('ranged')
            }

            if (traits.some(t => t.name === 'propulsive')) {
                ability = 'str';
                const strengthModifier = Math.floor((actor.data.abilities.str.value - 10) / 2);
                modifier = (strengthModifier < 0) ? strengthModifier : Math.floor(strengthModifier / 2);
                baseTraits.push('propulsive');
            }

            // check for Rogue's Racket: Thief
            if (actor.items.some(i => i.type === 'feat' && i.name === 'Thief Racket') // character has Thief Racket class feature
                && (!traits.some(t => t.name === 'unarmed')) // NOT unarmed attack
                && (traits.some(t => t.name === 'finesse') && melee) // finesse melee weapon
                && Math.floor((actor.data.abilities.dex.value - 10) / 2) > modifier // dex bonus higher than the current bonus
            ) {
                ability = 'dex';
                modifier = Math.floor((actor.data.abilities.dex.value - 10) / 2);
            }

            if (ability) {
                numericModifiers.push(new PF2Modifier(CONFIG.abilities[ability], modifier, PF2ModifierType.ABILITY));
            }

            // check for weapon specialization
            const weaponSpecializationDamage = proficiencyRank > 1 ? proficiencyRank : 0;
            if (weaponSpecializationDamage > 0) {
                if (actor.items.some(i => i.type === 'feat' && i.name.startsWith('Greater Weapon Specialization'))) {
                    numericModifiers.push(new PF2Modifier(
                        'PF2E.GreaterWeaponSpecialization',
                        weaponSpecializationDamage * 2,
                        PF2ModifierType.UNTYPED,
                    ));
                } else if (actor.items.some(i => i.type === 'feat' && i.name.startsWith('Weapon Specialization'))) {
                    numericModifiers.push(new PF2Modifier(
                        'PF2E.WeaponSpecialization',
                        weaponSpecializationDamage,
                        PF2ModifierType.UNTYPED,
                    ));
                }
            }
            
            // add splash damage
            const splashDamage = weapon.data?.splashDamage?.value ?? 0;
            if (splashDamage > 0) {
                numericModifiers.push(new PF2Modifier(
                    'PF2E.WeaponSplashDamageLabel',
                    splashDamage,
                    PF2ModifierType.UNTYPED,
                ));
            }

            // add bonus damage
            const bonusDamage = weapon.data?.bonusDamage?.value ?? 0;
            if (bonusDamage > 0) {
                numericModifiers.push(new PF2Modifier(
                    'PF2E.WeaponBonusDamageLabel',
                    bonusDamage,
                    PF2ModifierType.UNTYPED,
                ));
            }
        }

        // Add enabled conditions and custom modifiers
        {
            const stats = [];
            if (weapon.data?.group?.value) {
                stats.push(`${weapon.data.group.value.toLowerCase()}-weapon-group-damage`);
            }
            if (ability) {
                stats.push(`${ability}-damage`);
            }
            const proficiencies = ['untrained', 'trained', 'expert', 'master', 'legendary'];
            stats.push(`${proficiencies[proficiencyRank]}-damage`);
            stats.push(`${weapon.name.replace(/\s+/g, '-').toLowerCase()}-damage`); // convert white spaces to dash and lower-case all letters
            stats.concat([`${weapon._id}-damage`, 'damage']).forEach((key) => {
                (statisticsModifiers[key] || [])
                    .forEach(m =>
                        numericModifiers.push(m.copy())
                    );
            });
        }

        // Add enabled custom dice
        {
            const stats = [];
            stats.push(`${weapon.name.replace(/\s+/g, '-').toLowerCase()}-damage`); // convert white spaces to dash and lower-case all letters
            stats.concat([`${weapon._id}-damage`, 'damage']).forEach((key) => {
                (damageDice[key] || [])
                    .forEach((d) => {
                        diceModifiers.push(d);
                    });
            });
        }

        const optionsForPredicates = traits.map(t => t.name).concat(options);
        diceModifiers = diceModifiers.filter(dm => dm.predicate.test(optionsForPredicates));
        numericModifiers = numericModifiers.filter(nm => nm.predicate.test(optionsForPredicates));

        // include dice number and size in damage tag
        diceModifiers.forEach(d => {
            d.name = game.i18n.localize(d.name);
            if (d.diceNumber > 0 && d.dieSize) {
                d.name += ` +${d.diceNumber}${d.dieSize}`;
            } else if (d.diceNumber > 0) {
                d.name += ` +${d.diceNumber}${baseDamageDie}`;
            } else if (d.dieSize) {
                d.name += ` ${d.dieSize}`;
            }
            if (
                d.category &&
                (d.diceNumber > 0 || d.dieSize) &&
                (!d.damageType || d.damageType === baseDamageType)
            ) {
                d.name += ` ${d.category}`;
            }
        });

        const damage: any = {
            name: `Damage Roll: ${weapon.name}`,
            base: {
                diceNumber: weapon.data.damage.dice,
                dieSize: baseDamageDie,
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
            traits: baseTraits,
            formula: {},
        };

        // non-lethal trait
        if (traits.some(t => t.name === 'nonlethal')) {
            damage.traits.push('nonlethal');
        }

        damage.formula.success = this.getFormula(damage, false);
        damage.formula.criticalSuccess = this.getFormula(damage, true);

        return damage;
    }

    /** Convert the damage definition into a final formula, depending on whether the hit is a critical or not. */
    static getFormula(damage: { base: any; diceModifiers: PF2DamageDice[]; traits: string[]; numericModifiers: PF2Modifier[]; }, critical: boolean) {
        const base = duplicate(damage.base);

        // override first, to ensure the dice stacking works properly
        let overrideDieSize = null;
        let overrideDamageType = null;
        damage.diceModifiers.filter(dm => dm.override).forEach(dm => {
            if ((critical && dm.critical) || !dm.critical) {
                overrideDieSize = dm.override.dieSize ?? overrideDieSize;
                overrideDamageType = dm.override.damageType ?? overrideDamageType;
            }
        });
        base.dieSize = overrideDieSize ?? base.dieSize;
        base.damageType = overrideDamageType ?? base.damageType;

        const dicePool: DamagePool = {};
        const critPool: DamagePool = {};
        dicePool[base.damageType] = {
            base: true,
            dice: { [base.dieSize]: base.diceNumber }
        };

        // dice modifiers always stack
        damage.diceModifiers.filter(dm => !dm.critical || critical).forEach(dm => {
            if (critical && dm.critical) {
                // critical-only stuff
                if (dm.diceNumber) {
                    this.addDice(critPool, dm.damageType ?? base.damageType, dm.dieSize ?? base.dieSize, dm.diceNumber);
                }
                (dm.traits ?? []).filter(t => !damage.traits.includes(t)).forEach(t => {
                    damage.traits.push(t);
                });
            } else if (!dm.critical) {
                // regular pool
                if (dm.diceNumber) {
                    this.addDice(dicePool, dm.damageType ?? base.damageType, dm.dieSize ?? base.dieSize, dm.diceNumber);
                }
                (dm.traits ?? []).filter(t => !damage.traits.includes(t)).forEach(t => {
                    damage.traits.push(t);
                });
            } else {
                // skip
            }
        });

        // apply stacking rules here and distribute on dice pools
        {
            const modifiers: PF2Modifier[] = [];
            damage.numericModifiers.filter(nm => !nm.critical || critical).forEach(nm => {
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
                modifiers.reduce((accumulator, current) => {
                    // split numeric modifiers into separate lists for each damage type
                    const dmg = current.damageType ?? base.damageType;
                    accumulator[dmg] = (accumulator[dmg] ?? []).concat(current);
                    return accumulator;
                }, {} as Record<string, PF2Modifier[]>))
                .flatMap(([damageType, damageTypeModifiers]) => 
                    // apply stacking rules for numeric modifiers of each damage type separately 
                    new PF2StatisticModifier(`${damageType}-damage-stacking-rules`, damageTypeModifiers).enabledModifiers
                )
                .filter(nm => !nm.critical || critical)
                .forEach(nm => {
                    let pool = dicePool[nm.damageType ?? base.damageType];
                    if (!pool) {
                        pool = {};
                        dicePool[nm.damageType ?? base.damageType] = pool;
                    }
                    pool.modifier = (pool.modifier ?? 0) + nm.modifier;
                    (nm.traits ?? []).filter(t => !damage.traits.includes(t)).forEach(t => {
                        damage.traits.push(t);
                    });
                });
        }

        // build formula
        let formula = this.buildFormula(dicePool);
        if (critical) {
            formula = this.doubleFormula(formula);
            const critFormula = this.buildFormula(critPool);
            if (critFormula) {
                formula += ` + ${critFormula}`;
            }
        }

        return formula;
    }

    /** Add dice to the given damage pool. */
    public static addDice(pool: DamagePool, damageType: string, dieSize: string, count: number): DamagePool {
        // Ensure that the damage pool for this given damage type exists...
        pool[damageType] = pool[damageType] || {};
        const damagePool = pool[damageType];

        // And then add the given number of dice of the given size.
        damagePool.dice = damagePool.dice || {};
        damagePool.dice[dieSize] = (damagePool.dice[dieSize] ?? 0) + count;
        return pool;
    }

    /** Converts a damage pool to a final string formula. */
    public static buildFormula(pool: DamagePool): string {
        // First collect all of the individual components of the pool into one flattened list...
        const parts: string[] = [];
        let minValue = 0;
        for (const info of Object.values(pool)) {
            // Add all of the dice components; each individual dice adds one to the minimum value.
            for (const [dieSize, count] of Object.entries(info.dice ?? {})) {
                minValue += count;
                parts.push(`${count}${dieSize}`);
            }

            // Add the modifier if present.
            if (info.modifier) {
                minValue += info.modifier;
                parts.push(info.modifier.toString());
            }
        }

        // To avoid out-of-bounds exceptions, shortcircuit with the empty string if there are no damage components whatsoever.
        if (parts.length === 0) {
            return "";
        }

        // Then correct signs (adding '+' or '-' as appropriate) and join; don't modify the first component.
        const formula = [parts[0]].concat(parts.slice(1).flatMap(part => {
            if (part.startsWith("-")) {
                return ["-", part.substring(1)];
            } else {
                return ["+", part];
            }
        })).join(" ");

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
            const critRoll = new Roll(formula, {}).alter(2, 0, {multiplyNumeric: true});
            return critRoll.formula;
        }
    }
}