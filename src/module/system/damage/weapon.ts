import { ActorPF2e, CharacterPF2e, HazardPF2e, NPCPF2e } from "@actor";
import { TraitViewData } from "@actor/data/base.ts";
import {
    DamageDiceOverride,
    DamageDicePF2e,
    DiceModifierPF2e,
    ModifierPF2e,
    PROFICIENCY_RANK_OPTION,
    StatisticModifier,
} from "@actor/modifiers.ts";
import { AbilityString } from "@actor/types.ts";
import { MeleePF2e, WeaponPF2e } from "@item";
import { NPCAttackDamage } from "@item/melee/data.ts";
import { getPropertyRuneDice, getPropertyRuneModifierAdjustments } from "@item/physical/runes.ts";
import { WeaponDamage } from "@item/weapon/data.ts";
import { RollNotePF2e } from "@module/notes.ts";
import {
    extractDamageDice,
    extractDamageModifiers,
    extractModifierAdjustments,
    extractModifiers,
    extractNotes,
} from "@module/rules/helpers.ts";
import { CritSpecEffect, PotencySynthetic, StrikingSynthetic } from "@module/rules/synthetics.ts";
import { DEGREE_OF_SUCCESS, DegreeOfSuccessIndex } from "@system/degree-of-success.ts";
import { mapValues, objectHasKey, setHasElement, sluggify } from "@util";
import { AssembledFormula, createDamageFormula, parseTermsFromSimpleFormula } from "./formula.ts";
import { nextDamageDieSize } from "./helpers.ts";
import { DamageModifierDialog } from "./modifier-dialog.ts";
import {
    DamageCategoryUnique,
    DamageDieSize,
    DamageRollContext,
    MaterialDamageEffect,
    WeaponBaseDamageData,
    WeaponDamageFormulaData,
    WeaponDamageTemplate,
} from "./types.ts";
import { DAMAGE_DIE_FACES } from "./values.ts";

class WeaponDamagePF2e {
    static async fromNPCAttack({
        attack,
        actor,
        actionTraits = [],
        proficiencyRank = 0,
        context,
    }: NPCStrikeCalculateParams): Promise<WeaponDamageTemplate | null> {
        const secondaryInstances = Object.values(attack.system.damageRolls).slice(1).map(this.npcDamageToWeaponDamage);

        // Collect damage dice and modifiers from secondary damage instances
        const damageDice: DamageDicePF2e[] = [];
        const modifiers: ModifierPF2e[] = [];
        const labelFromCategory = {
            null: "",
            persistent: "",
            precision: "PF2E.Damage.Precision",
            splash: "PF2E.WeaponSplashDamageLabel",
        };
        for (const instance of secondaryInstances) {
            const { damageType } = instance;
            if (instance.dice > 0 && instance.die) {
                damageDice.push(
                    new DamageDicePF2e({
                        slug: "base",
                        label: labelFromCategory[instance.category ?? "null"],
                        selector: "damage",
                        diceNumber: instance.dice,
                        dieSize: instance.die,
                        damageType: instance.damageType,
                        category: instance.category,
                    })
                );
            }
            if (instance.modifier) {
                modifiers.push(
                    new ModifierPF2e({
                        label: labelFromCategory[instance.category ?? "null"],
                        modifier: instance.modifier,
                        damageType,
                        damageCategory: instance.category,
                    })
                );
            }
        }

        return WeaponDamagePF2e.calculate({
            weapon: attack,
            actor,
            damageDice,
            modifiers,
            actionTraits,
            proficiencyRank,
            context,
        });
    }

    static async calculate({
        weapon,
        actor,
        damageDice = [],
        modifiers = [],
        actionTraits = [],
        proficiencyRank,
        weaponPotency = null,
        context,
    }: WeaponDamageCalculateParams): Promise<WeaponDamageTemplate | null> {
        const { baseDamage } = weapon;
        const { options } = context;
        if (baseDamage.die === null && baseDamage.modifier > 0) {
            baseDamage.dice = 0;
        } else if (!weapon.dealsDamage) {
            return null;
        }

        const baseDomains = [`${weapon.id}-damage`, "damage", "strike-damage"];
        const weaponTraits = weapon.system.traits.value;
        // NPC attacks have precious materials as quasi-traits: separate for IWR processing and separate display in chat
        const materialTraits = weapon.isOfType("melee")
            ? weapon.system.traits.value.filter(
                  (t): t is MaterialDamageEffect => t in CONFIG.PF2E.materialDamageEffects
              )
            : [];

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
            const modifierValue = WeaponDamagePF2e.#strengthModToDamage(weapon)
                ? strengthModValue
                : weaponTraits.some((t) => t === "propulsive")
                ? strengthModValue < 0
                    ? strengthModValue
                    : Math.floor(strengthModValue / 2)
                : null;

            if (weapon.isOfType("weapon") && typeof modifierValue === "number") {
                const strModifier = new ModifierPF2e({
                    slug: "str",
                    label: CONFIG.PF2E.abilities.str,
                    ability: "str",
                    modifier: modifierValue,
                    type: "ability",
                    adjustments: extractModifierAdjustments(actor.synthetics.modifierAdjustments, baseDomains, "str"),
                });
                modifiers.push(strModifier);
            }
        }

        // Find the best active ability modifier in order to get the correct synthetics selectors
        const resolvables = { weapon };
        const injectables = resolvables;
        const fromDamageSelector = extractModifiers(actor.synthetics, baseDomains, {
            resolvables,
            injectables,
            test: options,
        });
        const modifiersAndSelectors = modifiers
            .concat(fromDamageSelector)
            .filter((m): m is ModifierPF2e & { ability: AbilityString } => m.type === "ability")
            .map((modifier) => {
                const selectors = this.#getSelectors(weapon, modifier.ability, proficiencyRank);
                return { modifier, selectors };
            });

        const { selectors } =
            modifiersAndSelectors.length > 0
                ? modifiersAndSelectors.reduce((best, candidate) =>
                      candidate.modifier.modifier > best.modifier.modifier ? candidate : best
                  )
                : { selectors: this.#getSelectors(weapon, null, proficiencyRank) };

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
            const handsHeld = weapon.system.equipped.handsHeld ?? 0;
            const baseDieFaces = Number(baseDamage.die?.replace("d", "") ?? "NaN");
            const twoHandSize = weaponTraits.find((t) => t.startsWith("two-hand-"))?.replace("two-hand-", "");
            const twoHandFaces = Number(twoHandSize?.replace("d", "") ?? "NaN");
            if (handsHeld === 2 && setHasElement(DAMAGE_DIE_FACES, twoHandSize) && twoHandFaces > baseDieFaces) {
                baseDamage.die = twoHandSize;
            }

            // Splash damage
            const splashDamage = Number(weapon.system.splashDamage?.value);
            if (splashDamage > 0) {
                const modifier = new ModifierPF2e({
                    slug: "splash",
                    label: "PF2E.WeaponSplashDamageLabel",
                    modifier: splashDamage,
                    damageCategory: "splash",
                    adjustments: extractModifierAdjustments(actor.synthetics.modifierAdjustments, selectors, "splash"),
                });
                modifiers.push(modifier);
            }

            // Scatter damage
            const scatterTrait = weaponTraits.find((t) => t.startsWith("scatter-"));
            if (scatterTrait && baseDamage.die) {
                const modifier = new ModifierPF2e({
                    slug: "scatter",
                    label: "PF2E.Damage.Scatter",
                    modifier: baseDamage.dice,
                    damageCategory: "splash",
                    adjustments: extractModifierAdjustments(actor.synthetics.modifierAdjustments, selectors, "scatter"),
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
        if (
            strikingSynthetic &&
            baseDamage.die &&
            (weapon.isOfType("melee") || strikingSynthetic.bonus > weapon.system.runes.striking)
        ) {
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

        // Persistent damage inherent to the weapon
        if (baseDamage.persistent?.faces) {
            damageDice.push(
                new DamageDicePF2e({
                    selector: `${weapon.id}-damage`,
                    slug: "weapon-persistent",
                    label: "PF2E.ConditionTypePersistent",
                    diceNumber: baseDamage.persistent.number,
                    dieSize: `d${baseDamage.persistent.faces}`,
                    damageType: baseDamage.persistent.type,
                    category: "persistent",
                })
            );
        } else if (baseDamage.persistent?.number) {
            modifiers.push(
                new ModifierPF2e({
                    slug: "weapon-persistent",
                    label: "PF2E.ConditionTypePersistent",
                    modifier: baseDamage.persistent.number,
                    damageType: baseDamage.persistent.type,
                    damageCategory: "persistent",
                })
            );
        }

        // Critical specialization effects
        const critSpecEffect = ((): CritSpecEffect => {
            // If an alternate critical specialization effect is available, apply it only if there is also a
            // qualifying non-alternate
            const critSpecs = actor.synthetics.criticalSpecalizations;
            const standard = critSpecs.standard.reduceRight(
                (result: CritSpecEffect | null, cs) => result ?? cs?.(weapon, options),
                null
            );
            const alternate = critSpecs.alternate.reduceRight(
                (result: CritSpecEffect | null, cs) => result ?? cs?.(weapon, options),
                null
            );

            return standard ? alternate ?? standard : [];
        })();

        if (critSpecEffect.length > 0) options.add("critical-specialization");
        modifiers.push(...critSpecEffect.filter((e): e is ModifierPF2e => e instanceof ModifierPF2e));
        damageDice.push(...critSpecEffect.filter((e): e is DamageDicePF2e => e instanceof DamageDicePF2e));

        // Property Runes
        const propertyRunes = weapon.isOfType("weapon") ? weapon.system.runes.property : [];
        damageDice.push(...getPropertyRuneDice(propertyRunes, options));
        const propertyRuneAdjustments = getPropertyRuneModifierAdjustments(propertyRunes);
        const ignoredResistances = propertyRunes.flatMap(
            (r) => CONFIG.PF2E.runes.weapon.property[r].damage?.ignoredResistances ?? []
        );

        // Backstabber trait
        if (weaponTraits.some((t) => t === "backstabber") && options.has("target:condition:flat-footed")) {
            const modifier = new ModifierPF2e({
                label: CONFIG.PF2E.weaponTraits.backstabber,
                slug: "backstabber",
                modifier: potency > 2 ? 2 : 1,
                damageCategory: "precision",
                adjustments: extractModifierAdjustments(actor.synthetics.modifierAdjustments, selectors, "backstabber"),
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
                    damageType: baseDamage.damageType,
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
                    damageType: baseDamage.damageType,
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

        // Roll notes
        const runeNotes = propertyRunes.flatMap((r) => {
            const data = CONFIG.PF2E.runes.weapon.property[r].damage?.notes ?? [];
            return data.map((d) => new RollNotePF2e({ selector: "strike-damage", ...d }));
        });

        const notes = [
            runeNotes,
            extractNotes(actor.synthetics.rollNotes, selectors),
            critSpecEffect.filter((e): e is RollNotePF2e => e instanceof RollNotePF2e),
        ]
            .flat()
            .filter((n) => n.predicate.test(options));

        // Accumulate damage-affecting precious materials
        const material = objectHasKey(CONFIG.PF2E.materialDamageEffects, weapon.system.material.precious?.type)
            ? weapon.system.material.precious!.type
            : null;
        const materials: Set<MaterialDamageEffect> = new Set([materialTraits, material ?? []].flat());
        for (const adjustment of actor.synthetics.strikeAdjustments) {
            adjustment.adjustDamageRoll?.(weapon, { materials });
        }

        for (const option of Array.from(materials).map((m) => `item:material:${m}`)) {
            options.add(option);
        }

        // Attach modifier adjustments from property runes
        for (const modifier of modifiers) {
            modifier.adjustments.push(...propertyRuneAdjustments.filter((a) => a.slug === modifier.slug));
        }

        // Synthetics

        // Separate damage modifiers into persistent and all others for stacking rules processing
        const synthetics = extractDamageModifiers(actor.synthetics, selectors, {
            resolvables,
            injectables,
            test: options,
        });
        const testedModifiers = [
            ...new StatisticModifier("strike-damage", [...modifiers, ...synthetics.main], options).modifiers,
            ...new StatisticModifier("strike-persistent", synthetics.persistent, options).modifiers,
        ];

        const base: WeaponBaseDamageData = {
            diceNumber: baseDamage.die ? baseDamage.dice : 0,
            dieSize: baseDamage.die,
            modifier: baseDamage.modifier,
            damageType: baseDamage.damageType,
            category: "category" in baseDamage && baseDamage.category === "persistent" ? "persistent" : null,
            materials: Array.from(materials),
        };

        // Damage dice from synthetics
        damageDice.push(
            ...extractDamageDice(actor.synthetics.damageDice, selectors, {
                test: options,
                resolvables: { weapon },
                injectables: { weapon },
            })
        );

        const damage: WeaponDamageFormulaData = {
            base: [base],
            // CRB p. 279, Counting Damage Dice: Effects based on a weapon's number of damage dice include
            // only the weapon's damage die plus any extra dice from a striking rune. They don't count
            // extra dice from abilities, critical specialization effects, property runes, weapon traits,
            // or the like.
            dice: damageDice,
            modifiers: testedModifiers,
            ignoredResistances,
        };

        // If a weapon deals no base damage, remove all bonuses, penalties, and modifiers to it.
        if (!(damage.base[0].diceNumber || damage.base[0].modifier)) {
            damage.dice = damage.dice.filter((d) => ![null, "precision"].includes(d.category));
            damage.modifiers = damage.modifiers.filter((m) => ![null, "precision"].includes(m.category));
        }

        const excludeFrom = weapon.isOfType("weapon") ? weapon : null;
        this.#excludeDamage({ actor, weapon: excludeFrom, modifiers: [...modifiers, ...damageDice], options });

        if (BUILD_MODE === "development" && !context.skipDialog) {
            const rolled = await new DamageModifierDialog({ damage, context }).resolve();
            if (!rolled) return null;
        }

        const computedFormulas = {
            criticalFailure: null,
            failure: this.#finalizeDamage(damage, DEGREE_OF_SUCCESS.FAILURE),
            success: this.#finalizeDamage(damage, DEGREE_OF_SUCCESS.SUCCESS),
            criticalSuccess: this.#finalizeDamage(damage, DEGREE_OF_SUCCESS.CRITICAL_SUCCESS),
        };

        return {
            name: `${game.i18n.localize("PF2E.DamageRoll")}: ${weapon.name}`,
            notes,
            traits: (actionTraits ?? []).map((t) => t.name),
            materials: Array.from(materials),
            modifiers: [...modifiers, ...damageDice],
            domains: selectors,
            damage: {
                ...damage,
                formula: mapValues(computedFormulas, (formula) => formula?.formula ?? null),
                breakdown: mapValues(computedFormulas, (formula) => formula?.breakdown ?? []),
            },
        };
    }

    /** Apply damage dice overrides and create a damage formula */
    static #finalizeDamage(
        damage: WeaponDamageFormulaData,
        degree: (typeof DEGREE_OF_SUCCESS)["SUCCESS" | "CRITICAL_SUCCESS"]
    ): AssembledFormula;
    static #finalizeDamage(damage: WeaponDamageFormulaData, degree: typeof DEGREE_OF_SUCCESS.CRITICAL_FAILURE): null;
    static #finalizeDamage(damage: WeaponDamageFormulaData, degree?: DegreeOfSuccessIndex): AssembledFormula | null;
    static #finalizeDamage(damage: WeaponDamageFormulaData, degree: DegreeOfSuccessIndex): AssembledFormula | null {
        damage = deepClone(damage);
        const base = damage.base.at(0);
        const critical = degree === DEGREE_OF_SUCCESS.CRITICAL_SUCCESS;
        if (!base) return null;

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
                for (const die of damage.dice.filter((d) => /^(?:deadly|fatal)-/.test(d.slug))) {
                    die.damageType = override.override?.damageType ?? die.damageType;
                }
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

        if (weapon.category === "unarmed") {
            selectors.push("unarmed-damage");
        }

        if (weapon.group) {
            selectors.push(`${weapon.group}-weapon-group-damage`);
        }

        if (weapon.baseType) {
            selectors.push(`${weapon.baseType}-base-type-damage`);
        }

        // Include selectors for "equivalent weapons": longbow for composite longbow, etc.
        const equivalentWeapons: Record<string, string | undefined> = CONFIG.PF2E.equivalentWeapons;
        const baseType = equivalentWeapons[weapon.baseType ?? ""] ?? weapon.baseType;
        if (baseType && !selectors.includes(`${baseType}-damage`)) {
            selectors.push(`${baseType}-damage`);
        }

        if (weapon.isOfType("melee")) {
            if (this.#strengthBasedDamage(weapon)) {
                selectors.push("str-damage");
            }

            // Everything that follows is for weapon items only
            return selectors;
        }

        if (ability) {
            selectors.push(`${ability}-damage`);
        }

        if (proficiencyRank >= 0) {
            const proficiencies = ["untrained", "trained", "expert", "master", "legendary"];
            selectors.push(`${proficiencies[proficiencyRank]}-damage`);
        }

        return selectors;
    }

    /** Parse damage formulas from melee items and construct `WeaponDamage` objects out of them */
    static npcDamageToWeaponDamage(instance: NPCAttackDamage): ConvertedNPCDamage {
        // Despite it being a string formula, melee items only support a single dice and modifier term
        const terms = parseTermsFromSimpleFormula(instance.damage);
        const die = terms.find((t) => t.dice)?.dice;
        const modifier = terms.find((t) => t.modifier)?.modifier ?? 0;

        return {
            dice: die?.number ?? 0,
            die: die?.faces ? (`d${die.faces}` as DamageDieSize) : null,
            modifier,
            damageType: instance.damageType,
            persistent: null,
            category: instance.category,
        };
    }

    /** Determine whether the damage source is a strength-based statistic */
    static #strengthBasedDamage(weapon: WeaponPF2e | MeleePF2e): boolean {
        if (!weapon.actor?.isOfType("creature")) return false;

        const { traits } = weapon;
        return weapon.isMelee || (weapon.isThrown && !traits.has("splash")) || traits.has("propulsive");
    }

    /** Determine whether a strike's damage includes the actor's (full) strength modifier */
    static #strengthModToDamage(weapon: WeaponPF2e | MeleePF2e): boolean {
        return weapon.isOfType("weapon") && this.#strengthBasedDamage(weapon) && !weapon.traits.has("propulsive");
    }
}

interface ConvertedNPCDamage extends WeaponDamage {
    category: DamageCategoryUnique | null;
}

interface WeaponDamageCalculateParams {
    weapon: WeaponPF2e | MeleePF2e;
    actor: CharacterPF2e | NPCPF2e | HazardPF2e;
    actionTraits: TraitViewData[];
    proficiencyRank: number;
    weaponPotency?: PotencySynthetic | null;
    damageDice?: DamageDicePF2e[];
    modifiers?: ModifierPF2e[];
    context: DamageRollContext;
}

interface NPCStrikeCalculateParams {
    attack: MeleePF2e;
    actor: NPCPF2e | HazardPF2e;
    actionTraits: TraitViewData[];
    proficiencyRank: number;
    context: DamageRollContext;
}

interface ExcludeDamageParams {
    actor: ActorPF2e;
    modifiers: (DiceModifierPF2e | ModifierPF2e)[];
    weapon: WeaponPF2e | null;
    options: Set<string>;
}

export { ConvertedNPCDamage, WeaponDamagePF2e };
