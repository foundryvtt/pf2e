import { ActorPF2e, CharacterPF2e, NPCPF2e } from "@actor";
import { TraitViewData } from "@actor/data/base";
import {
    DamageDiceOverride,
    DamageDicePF2e,
    DiceModifierPF2e,
    ModifierPF2e,
    MODIFIER_TYPE,
    PROFICIENCY_RANK_OPTION,
    StatisticModifier,
} from "@actor/modifiers";
import { AbilityString } from "@actor/types";
import { MeleePF2e, WeaponPF2e } from "@item";
import { MeleeDamageRoll } from "@item/melee/data";
import { getPropertyRuneModifiers } from "@item/physical";
import { WeaponDamage, WeaponMaterialEffect, WEAPON_MATERIAL_EFFECTS } from "@item/weapon";
import { RollNotePF2e } from "@module/notes";
import {
    DamageDiceSynthetics,
    ModifierAdjustmentSynthetics,
    ModifierSynthetics,
    PotencySynthetic,
    StrikeAdjustment,
    StrikingSynthetic,
} from "@module/rules/synthetics";
import { extractDamageDice, extractModifiers } from "@module/rules/util";
import { PredicatePF2e } from "@system/predication";
import { groupBy, setHasElement, sluggify } from "@util";
import { DamageCategorization, DamageDieSize, DamageType, nextDamageDieSize } from ".";

class WeaponDamagePF2e {
    static calculateStrikeNPC(
        attack: MeleePF2e,
        actor: NPCPF2e,
        traits: TraitViewData[] = [],
        statisticsModifiers: ModifierSynthetics,
        modifierAdjustments: ModifierAdjustmentSynthetics,
        damageDice: DamageDiceSynthetics,
        proficiencyRank = 0,
        options: Set<string> = new Set(),
        rollNotes: Record<string, RollNotePF2e[]>,
        strikeAdjustments: StrikeAdjustment[]
    ): DamageTemplate | null {
        const secondaryInstances = Object.values(attack.system.damageRolls).slice(1).map(this.npcDamageToWeaponDamage);

        // Add secondary damage instances to flat modifier and damage dice synthetics
        for (const instance of secondaryInstances) {
            const { damageType } = instance;
            if (instance.dice > 0 && instance.die) {
                damageDice.damage.push(
                    () =>
                        new DamageDicePF2e({
                            slug: "base",
                            label: "PF2E.Damage.Base",
                            selector: "damage",
                            diceNumber: instance.dice,
                            dieSize: instance.die,
                            damageType: instance.damageType,
                        })
                );
            }
            // Amend numeric modifiers with any flat modifier
            if (instance.modifier) {
                const modifiers = (statisticsModifiers.damage ??= []);
                modifiers.push(
                    () => new ModifierPF2e({ label: "PF2E.WeaponBaseLabel", modifier: instance.modifier, damageType })
                );
            }
        }

        return WeaponDamagePF2e.calculate(
            attack,
            actor,
            traits,
            statisticsModifiers,
            modifierAdjustments,
            damageDice,
            proficiencyRank,
            options,
            rollNotes,
            null,
            {},
            strikeAdjustments
        );
    }

    static calculate(
        weapon: WeaponPF2e | MeleePF2e,
        actor: CharacterPF2e | NPCPF2e,
        traits: TraitViewData[] = [],
        statisticsModifiers: ModifierSynthetics,
        modifierAdjustments: ModifierAdjustmentSynthetics,
        damageDice: DamageDiceSynthetics,
        proficiencyRank = -1,
        options: Set<string> = new Set(),
        rollNotes: Record<string, RollNotePF2e[]>,
        weaponPotency: PotencySynthetic | null,
        striking: Record<string, StrikingSynthetic[]>,
        strikeAdjustments: StrikeAdjustment[]
    ): DamageTemplate | null {
        const { baseDamage } = weapon;
        if (baseDamage.dice === 0 && baseDamage.modifier === 0) {
            return null;
        }

        let effectDice = baseDamage.dice;
        const diceModifiers: DiceModifierPF2e[] = [];
        const numericModifiers: ModifierPF2e[] = [];
        const weaponTraits = weapon.system.traits.value;

        // Always add all weapon traits to the options
        for (const trait of weaponTraits) {
            options.add(trait);
        }

        if (proficiencyRank >= 0) {
            options.add(PROFICIENCY_RANK_OPTION[proficiencyRank]);
        }

        // Determine ability modifier
        {
            const isMelee = !!weapon.isMelee;
            options.add(isMelee ? "melee" : "ranged");
            const strengthModValue = actor.abilities.str.mod;
            const modifierValue = WeaponDamagePF2e.strengthModToDamage(weapon)
                ? strengthModValue
                : weaponTraits.some((t) => t === "propulsive")
                ? strengthModValue < 0
                    ? strengthModValue
                    : Math.floor(strengthModValue / 2)
                : null;

            if (weapon.isOfType("weapon") && typeof modifierValue === "number") {
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
        const resolvables = { weapon };
        const injectables = resolvables;
        const synthetics = { modifierAdjustments, statisticsModifiers };
        const fromDamageSelector = extractModifiers(synthetics, ["damage"], { resolvables, injectables });
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

        if (weapon.isOfType("weapon")) {
            // Kickback trait
            if (weaponTraits.includes("kickback")) {
                // For NPCs, subtract from the base damage and add back as an untype bonus
                numericModifiers.push(new ModifierPF2e({ label: CONFIG.PF2E.weaponTraits.kickback, modifier: 1 }));
            }

            // Two-Hand trait
            const twoHandTrait = weaponTraits.find(
                (t) => t.startsWith("two-hand-") && (weapon.system.equipped.handsHeld ?? 0) >= 2
            );
            if (twoHandTrait) {
                baseDamage.die = twoHandTrait.substring(twoHandTrait.lastIndexOf("-") + 1) as DamageDieSize;
            }

            // Splash damage
            const splashDamage = Number(weapon.system.splashDamage?.value);
            if (splashDamage > 0) {
                const modifier = new ModifierPF2e({
                    label: "PF2E.WeaponSplashDamageLabel",
                    modifier: splashDamage,
                    damageCategory: "splash",
                });
                numericModifiers.push(modifier);
            }

            // Bonus damage
            const bonusDamage = Number(weapon.system.bonusDamage?.value);
            if (bonusDamage > 0) {
                numericModifiers.push(
                    new ModifierPF2e({
                        label: "PF2E.WeaponBonusDamageLabel",
                        modifier: bonusDamage,
                    })
                );
            }

            // Custom damage
            const customDamage = weapon.system.property1;
            const normalDice = customDamage.dice ?? 0;
            if (normalDice > 0) {
                const damageType = customDamage.damageType || null;
                diceModifiers.push(
                    new DiceModifierPF2e({
                        label: "PF2E.WeaponCustomDamageLabel",
                        diceNumber: normalDice,
                        dieSize: customDamage.die as DamageDieSize,
                        damageType: damageType,
                    })
                );
            }
            const critDice = customDamage.critDice ?? 0;
            if (critDice > 0) {
                const damageType = customDamage.critDamageType || null;
                diceModifiers.push(
                    new DiceModifierPF2e({
                        label: "PF2E.WeaponCustomDamageLabel",
                        diceNumber: critDice,
                        dieSize: customDamage.critDie as DamageDieSize,
                        damageType: damageType,
                        critical: true,
                    })
                );
            }
        }

        // potency
        const potency = weaponPotency?.bonus ?? 0;

        // striking rune
        let strikingDice = 0;
        {
            const strikingList: StrikingSynthetic[] = [];
            selectors.forEach((key) => {
                (striking[key] ?? [])
                    .filter((wp) => PredicatePF2e.test(wp.predicate, options))
                    .forEach((wp) => strikingList.push(wp));
            });

            // find best striking source
            const strikingRune = weapon.isOfType("weapon") ? weapon.system.runes.striking : null;
            if (strikingRune) {
                strikingList.push({
                    label: "PF2E.StrikingRuneLabel",
                    bonus: strikingRune,
                    predicate: new PredicatePF2e(),
                });
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

        // Ghost touch
        if (propertyRunes.includes("ghostTouch")) {
            diceModifiers.push(new DiceModifierPF2e({ label: CONFIG.PF2E.weaponPropertyRunes.ghostTouch }));
        }

        // Backstabber trait
        if (weaponTraits.some((t) => t === "backstabber") && options.has("target:condition:flat-footed")) {
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
                    dieSize: (/-\d?(d\d{1,2})$/.exec(slug)?.at(1) ?? baseDamage.die) as DamageDieSize,
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

        // Check for weapon specialization
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

        // Synthetic modifiers
        const syntheticModifiers = extractModifiers(synthetics, selectors, { resolvables, injectables });
        numericModifiers.push(...new StatisticModifier("", syntheticModifiers, options).modifiers);

        // Roll notes
        const runeNotes = propertyRunes.flatMap((r) => {
            const data = CONFIG.PF2E.runes.weapon.property[r].damage?.notes ?? [];
            return data.map((d) => new RollNotePF2e({ selector: "strike-damage", ...d }));
        });

        (rollNotes["strike-damage"] ??= []).push(...runeNotes);
        const notes = selectors.flatMap(
            (s) => rollNotes[s]?.map((n) => n.clone()).filter((n) => n.predicate.test(options)) ?? []
        );

        // Accumulate damage-affecting precious materials
        const material = setHasElement(WEAPON_MATERIAL_EFFECTS, weapon.system.material.precious)
            ? weapon.system.material.precious
            : null;
        const materials: Set<WeaponMaterialEffect> = new Set();
        if (material) materials.add(material);
        for (const adjustment of strikeAdjustments) {
            adjustment.adjustDamageRoll?.(weapon, { materials });
        }

        for (const option of Array.from(materials).map((m) => `weapon:material:${m}`)) {
            options.add(option);
        }

        const damage: Omit<DamageTemplate, "formula"> = {
            name: `${game.i18n.localize("PF2E.DamageRoll")}: ${weapon.name}`,
            base: {
                diceNumber: baseDamage.dice,
                dieSize: baseDamage.die,
                modifier: baseDamage.modifier,
                category: DamageCategorization.fromDamageType(baseDamage.damageType),
                damageType: baseDamage.damageType,
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
        diceModifiers.push(
            ...extractDamageDice(damageDice, selectors, {
                test: options,
                resolvables: { weapon },
                injectables: { weapon },
            })
        );

        // include dice number and size in damage tag
        for (const dice of diceModifiers) {
            dice.label = game.i18n.localize(dice.label ?? dice.slug);
            if (dice.diceNumber > 0 && dice.dieSize) {
                dice.label += ` +${dice.diceNumber}${dice.dieSize}`;
            } else if (dice.diceNumber > 0) {
                dice.label += ` +${dice.diceNumber}${damage.base.dieSize}`;
            } else if (dice.dieSize) {
                dice.label += ` ${dice.dieSize}`;
            }
            if (
                dice.category &&
                (dice.diceNumber > 0 || dice.dieSize) &&
                (!dice.damageType ||
                    (dice.damageType === damage.base.damageType && dice.category !== damage.base.category))
            ) {
                dice.label += ` ${dice.category}`;
            }
            dice.enabled = dice.predicate.test(options);
            dice.ignored = !dice.enabled;
        }

        const excludeFrom = weapon.isOfType("weapon") ? weapon : null;
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
        if (base.dieSize && hasUpgrade && !hasDowngrade) {
            base.dieSize = nextDamageDieSize({ upgrade: base.dieSize });
        } else if (base.dieSize && hasDowngrade && !hasUpgrade) {
            base.dieSize = nextDamageDieSize({ downgrade: base.dieSize });
        }

        // Override next, to ensure the dice stacking works properly
        const damageOverrides = diceModifiers.filter(
            (dm): dm is DiceModifierPF2e & { override: DamageDiceOverride } => !!(dm.enabled && dm.override)
        );
        for (const override of damageOverrides) {
            if ((critical && override.critical !== false) || (!critical && !override.critical)) {
                base.dieSize = override.override.dieSize ?? base.dieSize;
                base.damageType = override.override.damageType ?? base.damageType;
                base.diceNumber = override.override.diceNumber ?? base.diceNumber;
            }
        }

        base.category = DamageCategorization.fromDamageType(base.damageType);

        const dicePool: DamagePool = {};
        const critPool: DamagePool = {};
        dicePool[base.damageType] = {
            base: true,
            categories: {
                [DamageCategorization.fromDamageType(base.damageType)]: {
                    dice: base.dieSize ? { [base.dieSize]: base.diceNumber } : {},
                    modifier: base.modifier ?? 0,
                },
            },
        };

        // dice modifiers always stack
        for (const dice of diceModifiers.filter((dm) => dm.enabled && (!dm.critical || critical))) {
            const dieSize = dice.dieSize || base.dieSize || null;
            if (dice.diceNumber <= 0 || !dieSize) continue;
            if (critical && dice.critical) {
                // critical-only stuff
                this.addDice(critPool, dice.damageType ?? base.damageType, dice.category, dieSize, dice.diceNumber);
            } else if (!dice.critical) {
                this.addDice(dicePool, dice.damageType ?? base.damageType, dice.category, dieSize, dice.diceNumber);
            }
        }

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

            const numericModifiers = Array.from(groupBy(modifiers, (m) => m.damageType ?? base.damageType).entries())
                .flatMap(
                    ([damageType, modifiers]) =>
                        // Apply stacking rules for numeric modifiers of each damage type separately
                        new StatisticModifier(`${damageType}-damage-stacking-rules`, modifiers).modifiers
                )
                .filter((nm) => nm.enabled && (!nm.critical || critical));

            for (const modifier of numericModifiers) {
                const damageType = modifier.damageType ?? base.damageType;
                const pool = (dicePool[damageType] ??= { categories: {} });
                const categorySlug = modifier.damageCategory ?? DamageCategorization.fromDamageType(damageType);
                const category = (pool.categories[categorySlug] ??= { modifier: 0, dice: {} });
                category.modifier += modifier.modifier;
                damage.traits.push(...modifier.traits);
            }

            damage.traits = Array.from(new Set(damage.traits));
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

    /** Add dice to the given damage pool */
    public static addDice(
        pool: DamagePool,
        damageType: string,
        category: string | null,
        dieSize: string,
        count: number
    ): DamagePool {
        // Ensure that the damage pool for this given damage type exists
        const damagePool = (pool[damageType] ??= { categories: {} });

        // Ensure that the damage category sub-pool for this given damage category exists
        const categorySlug = category ?? DamageCategorization.fromDamageType(damageType);
        const damageCategory = (damagePool.categories[categorySlug] ??= { dice: {}, modifier: 0 });
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
        for (const [type, components] of Object.entries(pool)) {
            for (const [category, info] of Object.entries(components.categories)) {
                const p: string[] = [];
                // Add all of the dice components; each individual dice adds one to the minimum value.
                for (const [dieSize, count] of Object.entries(info.dice)) {
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
            modifier.ignored = !modifier.predicate.test(options);
        }
    }

    /** Double a textual formula based on the current crit rules. */
    static doubleFormula(formula: string): string {
        const rule = game.settings.get("pf2e", "critRule");
        if (rule === "doubledamage") {
            return /^\d+$/.test(formula) ? `2 * ${formula}` : `2 * (${formula})`;
        } else {
            const critRoll = new Roll(formula).alter(2, 0, { multiplyNumeric: true });
            return critRoll.formula;
        }
    }

    private static getSelectors(
        weapon: WeaponPF2e | MeleePF2e,
        ability: AbilityString | null,
        proficiencyRank: number
    ): string[] {
        const selectors = [
            `${weapon.id}-damage`,
            `${weapon.slug ?? sluggify(weapon.name)}-damage`,
            "strike-damage",
            "damage",
        ];

        if (weapon.isOfType("melee")) {
            if (this.strengthBasedDamage(weapon)) {
                selectors.push("str-damage");
            }
            return selectors;
        }

        if (weapon.group) {
            selectors.push(`${weapon.group}-weapon-group-damage`);
        }

        if (weapon.category === "unarmed") {
            selectors.push("unarmed-damage");
        }

        if (ability) {
            selectors.push(`${ability}-damage`);
        }

        if (proficiencyRank >= 0) {
            const proficiencies = ["untrained", "trained", "expert", "master", "legendary"];
            selectors.push(`${proficiencies[proficiencyRank]}-damage`);
        }

        const equivalentWeapons: Record<string, string | undefined> = CONFIG.PF2E.equivalentWeapons;
        const baseType = equivalentWeapons[weapon.baseType ?? ""] ?? weapon.baseType;
        if (baseType && !selectors.includes(`${baseType}-damage`)) {
            selectors.push(`${baseType}-damage`);
        }

        return selectors;
    }

    /** Parse damage formulas from melee items and construct `WeaponDamage` objects out of them */
    static npcDamageToWeaponDamage(instance: MeleeDamageRoll): WeaponDamage {
        const roll = new Roll(instance.damage);
        const die = roll.dice.at(0);
        const operator = ((): ArithmeticOperator => {
            const operators = roll.terms.filter((t): t is OperatorTerm => t instanceof OperatorTerm);
            if (operators.length === 1) {
                // Simplest case: a single operator
                return operators.at(0)?.operator ?? "+";
            } else if (operators.length === 2) {
                // A plus and minus?
                const [first, second] = operators;
                if (first.operator !== second.operator && operators.every((o) => ["+", "-"].includes(o.operator))) {
                    return "-";
                }
            }

            // Don't handle cases other than the above
            return "+";
        })();
        const modifier = roll.terms.find((t): t is NumericTerm => t instanceof NumericTerm)?.number ?? 0;

        return {
            dice: die?.number ?? 0,
            die: die?.faces ? (`d${die.faces}` as DamageDieSize) : null,
            modifier: operator === "+" ? modifier : -1 * modifier,
            damageType: instance.damageType,
        };
    }

    /** Determine whether the damage source is a strength-based statistic */
    static strengthBasedDamage(weapon: WeaponPF2e | MeleePF2e): boolean {
        return weapon.isMelee || (weapon.isThrown && !weapon.traits.has("splash"));
    }

    /** Determine whether a strike's damage includes the actor's strength modifier */
    static strengthModToDamage(weapon: WeaponPF2e | MeleePF2e): boolean {
        return weapon.isOfType("weapon") && this.strengthBasedDamage(weapon);
    }
}

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
        dieSize: DamageDieSize | null;
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
                modifier: number;
                /** Maps the die face ("d4", "d6", "d8", "d10", "d12") to the number of dice of that type. */
                dice: Record<string, number>;
            };
        };
    }
>;

interface ExcludeDamageParams {
    actor: ActorPF2e;
    modifiers: (DiceModifierPF2e | ModifierPF2e)[];
    weapon: WeaponPF2e | null;
    options: Set<string>;
}

export { WeaponDamagePF2e };
