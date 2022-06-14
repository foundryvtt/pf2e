import { ActorPF2e, CharacterPF2e, NPCPF2e } from "@actor";
import { AbilityString, TraitViewData } from "@actor/data/base";
import {
    DamageDiceOverride,
    DamageDicePF2e,
    DiceModifierPF2e,
    ModifierPF2e,
    MODIFIER_TYPE,
    PROFICIENCY_RANK_OPTION,
    StatisticModifier,
} from "@actor/modifiers";
import { WeaponPF2e } from "@item";
import { WeaponData } from "@item/data";
import { getPropertyRuneModifiers, getStrikingDice } from "@item/runes";
import { WeaponMaterialEffect } from "@item/weapon/types";
import { WEAPON_MATERIAL_EFFECTS } from "@item/weapon/values";
import { RollNotePF2e } from "@module/notes";
import { StrikingPF2e, WeaponPotencyPF2e } from "@module/rules/rule-element";
import { DeferredModifier, StrikeAdjustment } from "@module/rules/rule-element/data";
import { extractModifiers } from "@module/rules/util";
import { PredicatePF2e } from "@system/predication";
import { setHasElement, sluggify } from "@util";
import { DamageCategorization, DamageDieSize, DamageType, nextDamageDieSize } from ".";

export interface DamagePartials {
    [damageType: string]: {
        [damageCategory: string]: string;
    };
}

export interface DamageFormula {
    data: {
        baseDamageType: DamageType;
        effectiveDamageDice: number;
    };
    formula: string;
    partials: DamagePartials;
}

export interface DamageTemplate {
    base: {
        damageType: DamageType;
        diceNumber: number;
        dieSize: DamageDieSize;
        category: string;
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
    materials: WeaponMaterialEffect[];
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

/**
 * @category PF2
 */
export class WeaponDamagePF2e {
    static calculateStrikeNPC(
        weapon: any,
        actor: NPCPF2e,
        traits: TraitViewData[] = [],
        statisticsModifiers: Record<string, DeferredModifier[]>,
        damageDice: Record<string, DamageDicePF2e[]>,
        proficiencyRank = 0,
        options: string[] = [],
        rollNotes: Record<string, RollNotePF2e[]>
    ): DamageTemplate {
        // ensure the base damage object exists
        weapon.data.damage ??= {};

        const damageRolls = Array.isArray(weapon.data.damageRolls)
            ? weapon.data.damageRolls
            : Object.values(weapon.data.damageRolls);
        let parsedBaseDamage = false;
        for (const dmg of damageRolls) {
            let dice: number | null = null;
            let die: string | null = null;
            let modifier = 0;
            const parts = dmg.damage.split("");
            let digits = "";
            let operator = null;
            for (const part of parts) {
                if (part === "d") {
                    dice = Number(digits);
                    digits = "";
                } else if ("+-".includes(part)) {
                    if (operator) {
                        // deal with the previous flat modifier part
                        if (operator === "-") {
                            modifier -= Number(digits);
                        } else if (operator === "+") {
                            modifier += Number(digits);
                        }
                    } else {
                        die = `d${digits}`;
                    }
                    digits = "";
                    operator = part;
                } else if (!Number.isNaN(Number(part))) {
                    digits += part;
                }
            }
            if (dice && !die) {
                die = `d${digits}`;
            } else if (operator === "-") {
                modifier -= Number(digits);
            } else {
                modifier += Number(digits);
            }

            weapon.data.material = { effects: [] };

            if (parsedBaseDamage) {
                const { damageType } = dmg;
                // amend damage dice with any extra dice
                if (dice && die) {
                    const dd = (damageDice.damage ??= []);
                    dd.push(
                        new DamageDicePF2e({
                            slug: "base",
                            selector: "damage",
                            name: "Base",
                            diceNumber: dice,
                            dieSize: die as DamageDieSize,
                            damageType: dmg.damageType,
                        })
                    );
                }
                // Amend numeric modifiers with any flat modifier
                if (modifier) {
                    const modifiers = (statisticsModifiers.damage ??= []);
                    modifiers.push(() => new ModifierPF2e({ label: "PF2E.WeaponBaseLabel", modifier, damageType }));
                }
            } else {
                weapon.data.damage.dice = dice || 0;
                weapon.data.damage.die = die || "";
                const strengthMod = actor.data.data.abilities.str.mod;
                const weaponTraits: string[] = weapon.data.traits.value;

                if (WeaponDamagePF2e.strengthModToDamage(weapon)) {
                    modifier -= strengthMod;
                } else if (weaponTraits.some((t) => t === "propulsive")) {
                    modifier -= strengthMod < 0 ? -strengthMod : Math.round(strengthMod / 2);
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
            []
        );
    }

    static calculate(
        weapon: WeaponData,
        actor: CharacterPF2e | NPCPF2e,
        traits: TraitViewData[] = [],
        statisticsModifiers: Record<string, DeferredModifier[]>,
        damageDice: Record<string, DamageDicePF2e[]>,
        proficiencyRank = -1,
        options: string[] = [],
        rollNotes: Record<string, RollNotePF2e[]>,
        weaponPotency: WeaponPotencyPF2e | null,
        striking: Record<string, StrikingPF2e[]>,
        strikeAdjustments: StrikeAdjustment[]
    ): DamageTemplate {
        let effectDice = weapon.data.damage.dice ?? 1;
        const diceModifiers: DiceModifierPF2e[] = [];
        const numericModifiers: ModifierPF2e[] = [];
        let baseDamageDie = weapon.data.damage.die;
        const baseDamageType = weapon.data.damage.damageType;
        const weaponTraits = weapon.data.traits.value;

        // Always add all weapon traits to the options
        options.push(...weaponTraits);
        options.sort();

        if (proficiencyRank >= 0) {
            options.push(PROFICIENCY_RANK_OPTION[proficiencyRank]);
        }
        const actorData = actor.data;

        // Determine ability modifier
        {
            const isMelee = !!weapon.document?.isMelee;
            options.push(isMelee ? "melee" : "ranged");
            const strengthModValue = actorData.data.abilities.str.mod;
            const modifierValue = WeaponDamagePF2e.strengthModToDamage(weapon)
                ? strengthModValue
                : weaponTraits.some((t) => t === "propulsive")
                ? strengthModValue < 0
                    ? strengthModValue
                    : Math.floor(strengthModValue / 2)
                : null;

            if (typeof modifierValue === "number") {
                const strModifier = new ModifierPF2e({
                    label: CONFIG.PF2E.abilities.str,
                    ability: "str",
                    modifier: modifierValue,
                    type: MODIFIER_TYPE.ABILITY,
                });
                numericModifiers.push(strModifier);
            }
        }

        // Find the best active ability modifier in order to get the correct synthetics selectors
        const resolvables = { weapon: weapon.document };
        const injectables = resolvables;
        const fromDamageSelector = extractModifiers(statisticsModifiers, ["damage"], { resolvables, injectables });
        const modifiersAndSelectors = numericModifiers
            .concat(fromDamageSelector)
            .filter((m): m is ModifierPF2e & { ability: AbilityString } => m.type === "ability")
            .flatMap((modifier) => {
                const selectors = WeaponDamagePF2e.getSelectors(weapon, modifier.ability, proficiencyRank);
                return modifier.predicate.test(options) ? { modifier, selectors } : [];
            });

        const { selectors } =
            modifiersAndSelectors.length > 0
                ? modifiersAndSelectors.reduce((best, candidate) =>
                      candidate.modifier.modifier > best.modifier.modifier ? candidate : best
                  )
                : { selectors: WeaponDamagePF2e.getSelectors(weapon, null, proficiencyRank) };

        // Get just-in-time roll options from rule elements
        for (const rule of actor.rules.filter((r) => !r.ignored)) {
            rule.beforeRoll?.(selectors, options);
        }

        // Kickback trait
        if (weaponTraits.some((t) => t === "kickback")) {
            // For NPCs, subtract from the base damage and add back as an untype bonus
            if (actor instanceof NPCPF2e) weapon.data.damage.modifier -= 1;
            numericModifiers.push(new ModifierPF2e({ label: CONFIG.PF2E.weaponTraits.kickback, modifier: 1 }));
        }

        // Two-Hand trait
        const twoHandTrait = weaponTraits.find(
            (t) => t.startsWith("two-hand-") && (weapon.data?.equipped?.handsHeld ?? 0) >= 2
        );
        if (twoHandTrait) {
            baseDamageDie = twoHandTrait.substring(twoHandTrait.lastIndexOf("-") + 1) as DamageDieSize;
        }

        // Custom damage
        const normalDice = weapon.data.property1?.dice ?? 0;
        if (normalDice > 0) {
            const damageType = weapon.data.property1.damageType || null;
            diceModifiers.push(
                new DiceModifierPF2e({
                    label: "PF2E.WeaponCustomDamageLabel",
                    diceNumber: normalDice,
                    dieSize: weapon.data?.property1?.die as DamageDieSize,
                    damageType: damageType,
                })
            );
        }
        const critDice = weapon.data.property1?.critDice ?? 0;
        if (critDice > 0) {
            const damageType = weapon.data.property1.critDamageType || null;
            diceModifiers.push(
                new DiceModifierPF2e({
                    label: "PF2E.WeaponCustomDamageLabel",
                    diceNumber: critDice,
                    dieSize: weapon.data.property1.critDie as DamageDieSize,
                    damageType: damageType,
                    critical: true,
                })
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
                    .filter((wp) => PredicatePF2e.test(wp.predicate, options))
                    .forEach((wp) => strikingList.push(wp));
            });

            // find best striking source
            const strikingRune = weapon.type === "weapon" ? getStrikingDice(weapon.data) : null;
            if (strikingRune) {
                strikingList.push({ label: "PF2E.StrikingRuneLabel", bonus: strikingRune });
            }
            if (strikingList.length > 0) {
                const s = strikingList.reduce(
                    (highest, current) => (highest.bonus > current.bonus ? highest : current),
                    strikingList[0]
                );
                effectDice += s.bonus;
                strikingDice = s.bonus;
                diceModifiers.push(
                    new DiceModifierPF2e({
                        label: s.label,
                        diceNumber: s.bonus,
                    })
                );
            }
        }

        // Property Runes
        const propertyRunes = weaponPotency?.property ?? [];
        diceModifiers.push(...getPropertyRuneModifiers(propertyRunes));

        const runeNotes = propertyRunes.flatMap((r) => {
            const data = CONFIG.PF2E.runes.weapon.property[r].damage?.notes ?? [];
            return data.map((d) => new RollNotePF2e("strike-damage", d.text, d.predicate, d.outcome));
        });
        (rollNotes["strike-damage"] ??= []).push(...runeNotes);

        // Ghost touch
        if (propertyRunes.includes("ghostTouch")) {
            diceModifiers.push(new DiceModifierPF2e({ label: "PF2E.WeaponPropertyRuneGhostTouch" }));
        }

        // Backstabber trait
        if (weaponTraits.some((t) => t === "backstabber") && options.includes("target:condition:flat-footed")) {
            const modifier = new ModifierPF2e({
                label: CONFIG.PF2E.weaponTraits.backstabber,
                modifier: potency > 2 ? 2 : 1,
                damageCategory: "precision",
            });
            numericModifiers.push(modifier);
        }

        // Deadly trait
        const traitLabels: Record<string, string> = CONFIG.PF2E.weaponTraits;
        const deadlyTraits = weaponTraits.filter((t) => t.startsWith("deadly-"));
        for (const slug of deadlyTraits) {
            const diceNumber = (() => {
                const baseNumber = Number(/-(\d)d\d{1,2}$/.exec(slug)?.at(1)) || 1;
                return strikingDice > 1 ? strikingDice * baseNumber : baseNumber;
            })();
            diceModifiers.push(
                new DiceModifierPF2e({
                    label: traitLabels[slug],
                    diceNumber,
                    dieSize: (/-\d?(d\d{1,2})$/.exec(slug)?.at(1) ?? weapon.data.damage.die) as DamageDieSize,
                    critical: true,
                })
            );
        }

        // Fatal trait
        weaponTraits
            .filter((t) => t.startsWith("fatal-d"))
            .forEach((t) => {
                const dieSize = t.substring(t.indexOf("-") + 1) as DamageDieSize;
                diceModifiers.push(
                    new DiceModifierPF2e({
                        label: traitLabels[t],
                        diceNumber: 1,
                        dieSize,
                        critical: true,
                        enabled: true,
                        override: { dieSize },
                    })
                );
            });

        // check for weapon specialization
        const weaponSpecializationDamage = proficiencyRank > 1 ? proficiencyRank : 0;
        if (weaponSpecializationDamage > 0) {
            const has = (slug: string, name: string) =>
                actor.items.some(
                    (item) => item.type === "feat" && (item.slug?.startsWith(slug) || item.name.startsWith(name))
                );
            if (has("greater-weapon-specialization", "Greater Weapon Specialization")) {
                numericModifiers.push(
                    new ModifierPF2e({
                        label: "PF2E.GreaterWeaponSpecialization",
                        modifier: weaponSpecializationDamage * 2,
                    })
                );
            } else if (has("weapon-specialization", "Weapon Specialization")) {
                numericModifiers.push(
                    new ModifierPF2e({
                        label: "PF2E.WeaponSpecialization",
                        modifier: weaponSpecializationDamage,
                    })
                );
            }
        }

        // add splash damage
        const splashDamage = Number(weapon.data.splashDamage?.value) || 0;
        if (splashDamage > 0) {
            const modifier = new ModifierPF2e({
                label: "PF2E.WeaponSplashDamageLabel",
                modifier: splashDamage,
                damageCategory: "splash",
            });
            numericModifiers.push(modifier);
        }

        // Add bonus damage
        const bonusDamage = Number(weapon.data.bonusDamage?.value) || 0;
        if (bonusDamage > 0) {
            numericModifiers.push(
                new ModifierPF2e({
                    label: "PF2E.WeaponBonusDamageLabel",
                    modifier: bonusDamage,
                })
            );
        }

        // Synthetic modifiers
        const synthetics = extractModifiers(statisticsModifiers, selectors, { resolvables, injectables });
        numericModifiers.push(...new StatisticModifier("", synthetics, options).modifiers);

        const notes = selectors.flatMap(
            (s) =>
                rollNotes[s]
                    ?.map((note) => duplicate(note))
                    .filter((note) => PredicatePF2e.test(note.predicate, options)) ?? []
        );

        // Accumulate damage-affecting precious materials
        const material = setHasElement(WEAPON_MATERIAL_EFFECTS, weapon.data.material.precious)
            ? weapon.data.material.precious
            : null;
        const materials: Set<WeaponMaterialEffect> = new Set();
        if (material) materials.add(material);

        if (weapon.document instanceof WeaponPF2e) {
            for (const adjustment of strikeAdjustments) {
                adjustment.adjustDamageRoll?.(weapon.document as Embedded<WeaponPF2e>, { materials });
            }
        }
        for (const option of Array.from(materials).map((m) => `weapon:material:${m}`)) {
            options.push(option);
        }

        const damage: Omit<DamageTemplate, "formula"> = {
            name: `${game.i18n.localize("PF2E.DamageRoll")}: ${weapon.name}`,
            base: {
                diceNumber: weapon.data.damage.dice,
                dieSize: baseDamageDie,
                modifier: weapon.data.damage.modifier,
                category: DamageCategorization.fromDamageType(baseDamageType),
                damageType: baseDamageType,
            },
            // CRB p. 279, Counting Damage Dice: Effects based on a weapon's number of damage dice include
            // only the weapon's damage die plus any extra dice from a striking rune. They don't count
            // extra dice from abilities, critical specialization effects, property runes, weapon traits,
            // or the like.
            effectDice,
            diceModifiers,
            numericModifiers,
            notes,
            traits: (traits ?? []).map((t) => t.name),
            materials: Array.from(materials),
        };

        // Damage dice from synthetics
        for (const selector of selectors) {
            const testedDice =
                damageDice[selector]?.map((dice) => {
                    dice.enabled = dice.predicate.test(options);
                    dice.ignored = !dice.enabled;
                    return dice;
                }) ?? [];
            diceModifiers.push(...testedDice);
        }

        // include dice number and size in damage tag
        diceModifiers.forEach((d) => {
            d.label = game.i18n.localize(d.label ?? d.slug);
            if (d.diceNumber > 0 && d.dieSize) {
                d.label += ` +${d.diceNumber}${d.dieSize}`;
            } else if (d.diceNumber > 0) {
                d.label += ` +${d.diceNumber}${damage.base.dieSize}`;
            } else if (d.dieSize) {
                d.label += ` ${d.dieSize}`;
            }
            if (
                d.category &&
                (d.diceNumber > 0 || d.dieSize) &&
                (!d.damageType || (d.damageType === damage.base.damageType && d.category !== damage.base.category))
            ) {
                d.label += ` ${d.category}`;
            }
            d.enabled = new PredicatePF2e(d.predicate ?? {}).test(options);
            d.ignored = !d.enabled;
        });

        const excludeFrom = weapon.document instanceof WeaponPF2e ? weapon.document : null;
        this.excludeDamage({ actor, weapon: excludeFrom, modifiers: [...numericModifiers, ...diceModifiers], options });

        return {
            ...damage,
            formula: {
                success: this.getFormula(deepClone(damage), false),
                criticalSuccess: this.getFormula(deepClone(damage), true),
            },
        };
    }

    /** Convert the damage definition into a final formula, depending on whether the hit is a critical or not. */
    static getFormula(damage: Omit<DamageTemplate, "formula">, critical: boolean): DamageFormula {
        const { base } = damage;
        const diceModifiers: DiceModifierPF2e[] = damage.diceModifiers;

        // First, increase or decrease the damage die. This can only be done once, so we
        // only need to find the presence of a rule that does this
        const hasUpgrade = diceModifiers.some((dm) => dm.enabled && dm.override?.upgrade && (critical || !dm.critical));
        const hasDowngrade = diceModifiers.some(
            (dm) => dm.enabled && dm.override?.downgrade && (critical || !dm.critical)
        );
        if (hasUpgrade && !hasDowngrade) {
            base.dieSize = nextDamageDieSize({ upgrade: base.dieSize });
        } else if (hasDowngrade && !hasUpgrade) {
            base.dieSize = nextDamageDieSize({ downgrade: base.dieSize });
        }

        // Override next, to ensure the dice stacking works properly
        const enabledDiceModifiers = diceModifiers.filter(
            (dm): dm is DiceModifierPF2e & { override: DamageDiceOverride } => !!(dm.enabled && dm.override)
        );
        for (const dm of enabledDiceModifiers) {
            if (critical && dm.critical) {
                base.dieSize = dm.override.dieSize ?? base.dieSize;
                base.damageType = dm.override.damageType ?? base.damageType;
            } else if (!dm.critical) {
                base.dieSize = dm.override.dieSize ?? base.dieSize;
                base.damageType = dm.override.damageType ?? base.damageType;
            }
        }

        base.category = DamageCategorization.fromDamageType(base.damageType);

        const dicePool: DamagePool = {};
        const critPool: DamagePool = {};
        dicePool[base.damageType] = {
            base: true,
            categories: {
                [DamageCategorization.fromDamageType(base.damageType)]: {
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
                            dm.diceNumber
                        );
                    }
                } else if (!dm.critical && dm.diceNumber) {
                    this.addDice(
                        dicePool,
                        dm.damageType ?? base.damageType,
                        dm.category,
                        dm.dieSize ?? base.dieSize,
                        dm.diceNumber
                    );
                }
            });

        // Apply stacking rules here and distribute on dice pools
        {
            const modifiers = damage.numericModifiers
                .filter((nm: ModifierPF2e) => nm.enabled && (!nm.critical || critical))
                .flatMap((nm: ModifierPF2e) => {
                    nm.damageType ??= base.damageType;
                    nm.damageCategory ??= DamageCategorization.fromDamageType(nm.damageType);
                    if (critical && nm.damageCategory === "splash") {
                        return [];
                    } else if (critical && nm.critical) {
                        // Critical-only damage
                        return nm;
                    } else if (!nm.critical) {
                        // Regular pool
                        return nm;
                    }
                    // Skip
                    return [];
                });

            Object.entries(
                modifiers.reduce((accumulator: Record<string, ModifierPF2e[]>, current) => {
                    // Split numeric modifiers into separate lists for each damage type
                    const dmg = current.damageType ?? base.damageType;
                    accumulator[dmg] = (accumulator[dmg] ?? []).concat(current);
                    return accumulator;
                }, {})
            )
                .map(([damageType, damageTypeModifiers]) => {
                    // Apply stacking rules for numeric modifiers of each damage type separately
                    return new StatisticModifier(`${damageType}-damage-stacking-rules`, damageTypeModifiers).modifiers;
                })
                .flat()
                .filter((nm) => nm.enabled && (!nm.critical || critical))
                .forEach((nm) => {
                    const damageType = nm.damageType ?? base.damageType;
                    let pool = dicePool[damageType];
                    if (!pool) {
                        pool = { categories: {} };
                        dicePool[damageType] = pool;
                    }
                    let category =
                        pool.categories[nm.damageCategory ?? DamageCategorization.fromDamageType(damageType)];
                    if (!category) {
                        category = {};
                        pool.categories[nm.damageCategory ?? DamageCategorization.fromDamageType(damageType)] =
                            category;
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
            const splashDamage = damage.numericModifiers.find(
                (modifier) => modifier.enabled && modifier.damageCategory === "splash"
            );
            if (splashDamage) formula += ` + ${splashDamage.modifier}`;
            for (const [damageType, categories] of Object.entries(partials)) {
                for (const [damageCategory, f] of Object.entries(categories)) {
                    partials[damageType][damageCategory] = this.doubleFormula(f);
                    if (splashDamage?.damageType === damageType) {
                        partials[damageType][damageCategory] += ` + ${splashDamage.modifier}`;
                    }
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
                baseDamageType: base.damageType,
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
        count: number
    ): DamagePool {
        // Ensure that the damage pool for this given damage type exists...
        pool[damageType] = pool[damageType] || { categories: {} };
        const damagePool = pool[damageType];

        // Ensure that the damage category sub-pool for this given damage category exists...
        damagePool.categories[category ?? DamageCategorization.fromDamageType(damageType)] =
            damagePool.categories[category ?? DamageCategorization.fromDamageType(damageType)] || {};
        const damageCategory = damagePool.categories[category ?? DamageCategorization.fromDamageType(damageType)];

        // And then add the given number of dice of the given size.
        damageCategory.dice = damageCategory.dice || {};
        damageCategory.dice[dieSize] = (damageCategory.dice[dieSize] ?? 0) + count;
        return pool;
    }

    /** Converts a damage pool to a final string formula. */
    public static buildFormula(
        pool: DamagePool,
        partials: { [damageType: string]: { [damageCategory: string]: string } } = {}
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
                            if (part.startsWith("-")) {
                                return ["-", part.substring(1)];
                            } else {
                                return ["+", part];
                            }
                        })
                    )
                    .join(" ");
            }
        }

        // To avoid out-of-bounds exceptions, short-circuit with the empty string if there are no damage components whatsoever.
        if (parts.length === 0) {
            return "";
        }

        // Then correct signs (adding '+' or '-' as appropriate) and join; don't modify the first component.
        const formula = [parts[0]]
            .concat(
                parts.slice(1).flatMap((part) => {
                    if (part.startsWith("-")) {
                        return ["-", part.substring(1)];
                    } else {
                        return ["+", part];
                    }
                })
            )
            .join(" ");

        // Finally, if the minimum formula value can be 0 or lower, lower bound it.
        if (minValue <= 0) {
            return `{${formula}, 1}kh`;
        } else {
            return formula;
        }
    }

    /**
     * Retrieve exclusion terms from rule elements. Any term is not in the `any` or `all` predicate,
     * it is added to the `not` predicate
     */
    private static excludeDamage({ actor, modifiers, weapon, options }: ExcludeDamageParams): void {
        if (!weapon) return;

        const notIgnored = modifiers.filter((modifier) => !modifier.ignored);
        for (const rule of actor.rules) {
            rule.applyDamageExclusion?.(weapon, notIgnored);
        }
        for (const modifier of notIgnored) {
            modifier.ignored = !new PredicatePF2e(modifier.predicate ?? {}).test(options);
        }
    }

    /** Double a textual formula based on the current crit rules. */
    static doubleFormula(formula: string): string {
        const rule = game.settings.get("pf2e", "critRule");
        if (rule === "doubledamage") {
            return `2 * (${formula})`;
        } else {
            const critRoll = new Roll(formula).alter(2, 0, { multiplyNumeric: true });
            return critRoll.formula;
        }
    }

    private static getSelectors(weapon: WeaponData, ability: AbilityString | null, proficiencyRank: number): string[] {
        const selectors = [`${weapon._id}-damage`, "strike-damage", "damage"];
        if (weapon.data.group) {
            selectors.push(`${weapon.data.group}-weapon-group-damage`);
        }
        if (ability) {
            selectors.push(`${ability}-damage`);
        }
        if (proficiencyRank >= 0) {
            const proficiencies = ["untrained", "trained", "expert", "master", "legendary"];
            selectors.push(`${proficiencies[proficiencyRank]}-damage`);
        }

        const equivalentWeapons: Record<string, string | undefined> = CONFIG.PF2E.equivalentWeapons;
        const baseType = equivalentWeapons[weapon.data.baseItem ?? ""] ?? weapon.data.baseItem;
        selectors.push(`${weapon.data.slug ?? sluggify(weapon.name)}-damage`);
        if (baseType && !selectors.includes(`${baseType}-damage`)) {
            selectors.push(`${baseType}-damage`);
        }

        return selectors;
    }

    /** Determine whether a strike's damage includes the actor's strength modifier */
    static strengthModToDamage(weaponData: WeaponData): boolean {
        const isMelee = !!weaponData.document?.isMelee;
        const traits = weaponData.data.traits.value;
        return isMelee || (!traits.includes("splash") && traits.some((t) => /^thrown(?:-\d{1,2})?/.test(t)));
    }
}

interface ExcludeDamageParams {
    actor: ActorPF2e;
    modifiers: (DiceModifierPF2e | ModifierPF2e)[];
    weapon: WeaponPF2e | null;
    options: string[];
}
