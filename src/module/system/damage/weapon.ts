import { ActorPF2e, CharacterPF2e, HazardPF2e, NPCPF2e } from "@actor";
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
import { MeleePF2e, WeaponMaterialEffect, WeaponPF2e } from "@item";
import { MeleeDamageRoll } from "@item/melee/data";
import { getPropertyRuneModifiers } from "@item/physical/runes";
import { WeaponDamage } from "@item/weapon/data";
import { WEAPON_MATERIAL_EFFECTS } from "@item/weapon/values";
import { RollNotePF2e } from "@module/notes";
import { PotencySynthetic, StrikingSynthetic } from "@module/rules/synthetics";
import { extractDamageDice, extractModifiers, extractNotes } from "@module/rules/util";
import { DegreeOfSuccessIndex, DEGREE_OF_SUCCESS } from "@system/degree-of-success";
import { setHasElement, sluggify } from "@util";
import { createDamageFormula } from "./formula";
import { nextDamageDieSize } from "./helpers";
import { DamageDieSize, DamageFormulaData, WeaponDamageTemplate } from "./types";

class WeaponDamagePF2e {
    static calculateStrikeNPC(
        attack: MeleePF2e,
        actor: NPCPF2e | HazardPF2e,
        traits: TraitViewData[] = [],
        proficiencyRank = 0,
        options: Set<string> = new Set()
    ): WeaponDamageTemplate | null {
        const secondaryInstances = Object.values(attack.system.damageRolls).slice(1).map(this.npcDamageToWeaponDamage);

        // Add secondary damage instances to flat modifier and damage dice synthetics
        for (const instance of secondaryInstances) {
            const { damageType } = instance;
            if (instance.dice > 0 && instance.die) {
                actor.synthetics.damageDice.damage.push(
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
                const modifiers = actor.synthetics.statisticsModifiers.damage;
                modifiers.push(
                    () => new ModifierPF2e({ label: "PF2E.WeaponBaseLabel", modifier: instance.modifier, damageType })
                );
            }
        }

        return WeaponDamagePF2e.calculate(attack, actor, traits, proficiencyRank, options);
    }

    static calculate(
        weapon: WeaponPF2e | MeleePF2e,
        actor: CharacterPF2e | NPCPF2e | HazardPF2e,
        traits: TraitViewData[] = [],
        proficiencyRank: number,
        options: Set<string>,
        weaponPotency: PotencySynthetic | null = null
    ): WeaponDamageTemplate | null {
        const { baseDamage } = weapon;
        if (baseDamage.die === null && baseDamage.modifier > 0) {
            baseDamage.dice = 0;
        } else if (baseDamage.dice === 0 && baseDamage.modifier === 0) {
            return null;
        }

        const damageDice: DamageDicePF2e[] = [];
        const modifiers: ModifierPF2e[] = [];
        const weaponTraits = weapon.system.traits.value;

        // Always add all weapon traits to the options
        for (const trait of weaponTraits) {
            options.add(trait);
        }

        if (proficiencyRank >= 0) {
            options.add(PROFICIENCY_RANK_OPTION[proficiencyRank]);
        }

        const isMelee = !!weapon.isMelee;
        options.add(isMelee ? "melee" : "ranged");

        // Determine ability modifier
        if (actor.isOfType("character", "npc")) {
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
                modifiers.push(strModifier);
            }
        }

        // Find the best active ability modifier in order to get the correct synthetics selectors
        const resolvables = { weapon };
        const injectables = resolvables;
        const fromDamageSelector = extractModifiers(actor.synthetics, ["damage"], { resolvables, injectables });
        const modifiersAndSelectors = modifiers
            .concat(fromDamageSelector)
            .filter((m): m is ModifierPF2e & { ability: AbilityString } => m.type === "ability")
            .flatMap((modifier) => {
                const selectors = WeaponDamagePF2e.#getSelectors(weapon, modifier.ability, proficiencyRank);
                return modifier.predicate.test(options) ? { modifier, selectors } : [];
            });

        const { selectors } =
            modifiersAndSelectors.length > 0
                ? modifiersAndSelectors.reduce((best, candidate) =>
                      candidate.modifier.modifier > best.modifier.modifier ? candidate : best
                  )
                : { selectors: WeaponDamagePF2e.#getSelectors(weapon, null, proficiencyRank) };

        // Get just-in-time roll options from rule elements
        for (const rule of actor.rules.filter((r) => !r.ignored)) {
            rule.beforeRoll?.(selectors, options);
        }

        if (weapon.isOfType("weapon")) {
            // Kickback trait
            if (weaponTraits.includes("kickback")) {
                // For NPCs, subtract from the base damage and add back as an untype bonus
                modifiers.push(new ModifierPF2e({ label: CONFIG.PF2E.weaponTraits.kickback, modifier: 1 }));
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
                modifiers.push(modifier);
            }

            // Bonus damage
            const bonusDamage = Number(weapon.system.bonusDamage?.value);
            if (bonusDamage > 0) {
                modifiers.push(
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
                damageDice.push(
                    new DamageDicePF2e({
                        selector: `${weapon.id}-damage`,
                        slug: "custom",
                        label: "PF2E.WeaponCustomDamageLabel",
                        diceNumber: normalDice,
                        dieSize: customDamage.die,
                        damageType,
                    })
                );
            }
            const critDice = customDamage.critDice ?? 0;
            if (critDice > 0) {
                const damageType = customDamage.critDamageType || null;
                damageDice.push(
                    new DamageDicePF2e({
                        selector: `${weapon.id}-damage`,
                        slug: "custom-critical",
                        label: "PF2E.WeaponCustomDamageLabel",
                        diceNumber: critDice,
                        dieSize: customDamage.critDie,
                        damageType,
                        critical: true,
                    })
                );
            }
        }

        // Potency rune
        const potency = weaponPotency?.bonus ?? 0;

        // Striking rune

        const strikingSynthetic = selectors
            .flatMap((key) => actor.synthetics.striking[key] ?? [])
            .filter((wp) => wp.predicate.test(options))
            .reduce(
                (highest: StrikingSynthetic | null, current) =>
                    highest && highest.bonus > current.bonus ? highest : current,
                null
            );
        // Add damage dice if the "weapon" is an NPC attack or actual weapon with inferior etched striking rune
        if (strikingSynthetic && (weapon.isOfType("melee") || strikingSynthetic.bonus > weapon.system.runes.striking)) {
            damageDice.push(
                new DamageDicePF2e({
                    selector: `${weapon.id}-damage`,
                    slug: "striking",
                    label: strikingSynthetic.label,
                    diceNumber: strikingSynthetic.bonus,
                })
            );

            // Remove extra dice from weapon's etched striking rune
            if (weapon.isOfType("weapon")) {
                weapon.system.damage.dice -= weapon.system.runes.striking;
                weapon.system.runes.striking = 0;
            }
        }

        // Property Runes
        const propertyRunes = weaponPotency?.property ?? [];
        damageDice.push(...getPropertyRuneModifiers(propertyRunes));

        // Backstabber trait
        if (weaponTraits.some((t) => t === "backstabber") && options.has("target:condition:flat-footed")) {
            const modifier = new ModifierPF2e({
                label: CONFIG.PF2E.weaponTraits.backstabber,
                modifier: potency > 2 ? 2 : 1,
                damageCategory: "precision",
            });
            modifiers.push(modifier);
        }

        // Deadly trait
        const traitLabels: Record<string, string> = CONFIG.PF2E.weaponTraits;
        const deadlyTraits = weaponTraits.filter((t) => t.startsWith("deadly-"));
        // Get striking dice: the number of damage dice from a striking rune (or ABP devastating strikes)
        const strikingDice = ((): number => {
            if (weapon.isOfType("weapon")) {
                const weaponStrikingDice = weapon.system.damage.dice - weapon._source.system.damage.dice;
                return strikingSynthetic && strikingSynthetic.bonus > weaponStrikingDice
                    ? strikingSynthetic.bonus
                    : weaponStrikingDice;
            } else {
                return strikingSynthetic?.bonus ?? 0;
            }
        })();

        for (const slug of deadlyTraits) {
            const diceNumber = ((): number => {
                const baseNumber = Number(/-(\d)d\d{1,2}$/.exec(slug)?.at(1)) || 1;
                return strikingDice > 1 ? strikingDice * baseNumber : baseNumber;
            })();
            damageDice.push(
                new DamageDicePF2e({
                    selector: `${weapon.id}-damage`,
                    slug,
                    label: traitLabels[slug],
                    diceNumber,
                    dieSize: (/-\d?(d\d{1,2})$/.exec(slug)?.at(1) ?? baseDamage.die) as DamageDieSize,
                    critical: true,
                })
            );
        }

        // Fatal trait
        for (const trait of weaponTraits.filter((t) => t.startsWith("fatal-d"))) {
            const dieSize = trait.substring(trait.indexOf("-") + 1) as DamageDieSize;
            damageDice.push(
                new DamageDicePF2e({
                    selector: `${weapon.id}-damage`,
                    slug: trait,
                    label: traitLabels[trait],
                    diceNumber: 1,
                    dieSize,
                    critical: true,
                    enabled: true,
                    override: { dieSize },
                })
            );
        }

        // Check for weapon specialization
        const weaponSpecializationDamage = proficiencyRank > 1 ? proficiencyRank : 0;
        if (weaponSpecializationDamage > 0) {
            const has = (slug: string, name: string) =>
                actor.items.some(
                    (item) => item.type === "feat" && (item.slug?.startsWith(slug) || item.name.startsWith(name))
                );
            if (has("greater-weapon-specialization", "Greater Weapon Specialization")) {
                modifiers.push(
                    new ModifierPF2e({
                        label: "PF2E.GreaterWeaponSpecialization",
                        modifier: weaponSpecializationDamage * 2,
                    })
                );
            } else if (has("weapon-specialization", "Weapon Specialization")) {
                modifiers.push(
                    new ModifierPF2e({
                        label: "PF2E.WeaponSpecialization",
                        modifier: weaponSpecializationDamage,
                    })
                );
            }
        }

        // Synthetic modifiers

        // Roll notes
        const runeNotes = propertyRunes.flatMap((r) => {
            const data = CONFIG.PF2E.runes.weapon.property[r].damage?.notes ?? [];
            return data.map((d) => new RollNotePF2e({ selector: "strike-damage", ...d }));
        });

        (actor.synthetics.rollNotes["strike-damage"] ??= []).push(...runeNotes);
        const notes = extractNotes(actor.synthetics.rollNotes, selectors).filter((n) => n.predicate.test(options));

        // Accumulate damage-affecting precious materials
        const material = setHasElement(WEAPON_MATERIAL_EFFECTS, weapon.system.material.precious)
            ? weapon.system.material.precious
            : null;
        const materials: Set<WeaponMaterialEffect> = new Set();
        if (material) materials.add(material);
        for (const adjustment of actor.synthetics.strikeAdjustments) {
            adjustment.adjustDamageRoll?.(weapon, { materials });
        }

        for (const option of Array.from(materials).map((m) => `weapon:material:${m}`)) {
            options.add(option);
        }

        const syntheticModifiers = extractModifiers(actor.synthetics, selectors, { resolvables, injectables });
        const testedModifiers = [
            ...new StatisticModifier("", [...modifiers, ...syntheticModifiers], options).modifiers,
        ];

        // Damage dice from synthetics
        damageDice.push(
            ...extractDamageDice(actor.synthetics.damageDice, selectors, {
                test: options,
                resolvables: { weapon },
                injectables: { weapon },
            })
        );

        const damage: DamageFormulaData = {
            base: {
                diceNumber: baseDamage.dice,
                dieSize: baseDamage.die,
                modifier: baseDamage.modifier,
                damageType: baseDamage.damageType,
                category: null,
            },
            // CRB p. 279, Counting Damage Dice: Effects based on a weapon's number of damage dice include
            // only the weapon's damage die plus any extra dice from a striking rune. They don't count
            // extra dice from abilities, critical specialization effects, property runes, weapon traits,
            // or the like.
            dice: damageDice,
            modifiers: testedModifiers,
        };

        // include dice number and size in damage tag
        for (const dice of damage.dice) {
            dice.label = game.i18n.localize(dice.label ?? dice.slug);
            if (dice.diceNumber > 0 && dice.dieSize) {
                dice.label += ` +${dice.diceNumber}${dice.dieSize}`;
            } else if (damage.base.dieSize && dice.diceNumber > 0) {
                dice.label += ` +${dice.diceNumber}${damage.base.dieSize}`;
            } else if (dice.dieSize) {
                dice.label += ` ${dice.dieSize}`;
            }
            if (
                dice.category &&
                dice.category !== "persistent" &&
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
        this.#excludeDamage({ actor, weapon: excludeFrom, modifiers: [...modifiers, ...damageDice], options });

        return {
            name: `${game.i18n.localize("PF2E.DamageRoll")}: ${weapon.name}`,
            notes,
            traits: (traits ?? []).map((t) => t.name),
            materials: Array.from(materials),
            damage: {
                ...damage,
                formula: {
                    criticalFailure: null,
                    failure: this.#finalizeDamage(damage, DEGREE_OF_SUCCESS.FAILURE),
                    success: this.#finalizeDamage(damage, DEGREE_OF_SUCCESS.SUCCESS),
                    criticalSuccess: this.#finalizeDamage(damage, DEGREE_OF_SUCCESS.CRITICAL_SUCCESS),
                },
            },
        };
    }

    /** Apply damage dice overrides and create a damage formula */
    static #finalizeDamage(
        damage: DamageFormulaData,
        degree: typeof DEGREE_OF_SUCCESS["SUCCESS" | "CRITICAL_SUCCESS"]
    ): string;
    static #finalizeDamage(damage: DamageFormulaData, degree: typeof DEGREE_OF_SUCCESS.CRITICAL_FAILURE): null;
    static #finalizeDamage(damage: DamageFormulaData, degree?: DegreeOfSuccessIndex): string | null;
    static #finalizeDamage(damage: DamageFormulaData, degree: DegreeOfSuccessIndex): string | null {
        damage = deepClone(damage);
        const { base } = damage;
        const critical = degree === DEGREE_OF_SUCCESS.CRITICAL_SUCCESS;

        // Test that a damage modifier is compatible with the prior check result
        const outcomeMatches = (m: { critical: boolean | null }): boolean =>
            m.critical === null || (critical && m.critical) || (!critical && !m.critical);

        // First, increase or decrease the damage die. This can only be done once, so we
        // only need to find the presence of a rule that does this
        const hasUpgrade = damage.dice.some((d) => d.enabled && d.override?.upgrade && outcomeMatches(d));
        const hasDowngrade = damage.dice.some((d) => d.enabled && d.override?.downgrade && (critical || !d.critical));
        if (base.dieSize && hasUpgrade && !hasDowngrade) {
            base.dieSize = nextDamageDieSize({ upgrade: base.dieSize });
        } else if (base.dieSize && hasDowngrade && !hasUpgrade) {
            base.dieSize = nextDamageDieSize({ downgrade: base.dieSize });
        }

        // Override next, to ensure the dice stacking works properly
        const damageOverrides = damage.dice.filter(
            (d): d is DamageDicePF2e & { override: DamageDiceOverride } => !!(d.enabled && d.override)
        );
        for (const override of damageOverrides) {
            if ((critical && override.critical !== false) || (!critical && !override.critical)) {
                base.dieSize = override.override?.dieSize ?? base.dieSize;
                base.damageType = override.override?.damageType ?? base.damageType;
                base.diceNumber = override.override?.diceNumber ?? base.diceNumber;
            }
        }

        return createDamageFormula(damage, degree);
    }

    /**
     * Retrieve exclusion terms from rule elements. Any term is not in the `any` or `all` predicate,
     * it is added to the `not` predicate
     */
    static #excludeDamage({ actor, modifiers, weapon, options }: ExcludeDamageParams): void {
        if (!weapon) return;

        const notIgnored = modifiers.filter((modifier) => !modifier.ignored);
        for (const rule of actor.rules) {
            rule.applyDamageExclusion?.(weapon, notIgnored);
        }
        for (const modifier of notIgnored) {
            modifier.ignored = !modifier.predicate.test(options);
        }
    }

    static #getSelectors(
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

interface ExcludeDamageParams {
    actor: ActorPF2e;
    modifiers: (DiceModifierPF2e | ModifierPF2e)[];
    weapon: WeaponPF2e | null;
    options: Set<string>;
}

export { WeaponDamagePF2e };
