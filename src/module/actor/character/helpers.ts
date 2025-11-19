import type { ActorPF2e, CharacterPF2e } from "@actor";
import { AttackTraitHelpers } from "@actor/creature/helpers.ts";
import type { AttackAmmunitionData } from "@actor/data/base.ts";
import { Modifier } from "@actor/modifiers.ts";
import { AbilityItemPF2e, AmmoPF2e, ArmorPF2e, ConditionPF2e, ItemProxyPF2e, WeaponPF2e } from "@item";
import { getLoadedAmmo } from "@item/weapon/helpers.ts";
import type { ZeroToFour } from "@module/data.ts";
import { extractModifierAdjustments } from "@module/rules/helpers.ts";
import { DAMAGE_DIE_SIZES } from "@system/damage/values.ts";
import { Predicate } from "@system/predication.ts";
import { ErrorPF2e, getActionGlyph, objectHasKey, tupleHasValue } from "@util";
import * as R from "remeda";
import { WeaponAuxiliaryAction } from "./auxiliary.ts";
import type { MartialProficiency } from "./data.ts";

/** Handle weapon traits that introduce modifiers or add other weapon traits */
class PCAttackTraitHelpers extends AttackTraitHelpers {
    static adjustWeapon(weapon: WeaponPF2e): void {
        const traits = weapon.system.traits.value;
        for (const trait of [...traits]) {
            switch (trait.replace(/-d?\d{1,3}$/, "")) {
                case "fatal-aim": {
                    if (weapon.range?.increment && weapon.handsHeld === 2) {
                        const fatal = trait.replace("-aim", "");
                        if (objectHasKey(CONFIG.PF2E.weaponTraits, fatal) && !traits.includes(fatal)) {
                            traits.push(fatal);
                        }
                    }
                    break;
                }
                case "jousting": {
                    if (weapon.handsHeld === 1) {
                        const die = /(d\d{1,2})$/.exec(trait)?.[1];
                        if (tupleHasValue(DAMAGE_DIE_SIZES, die)) {
                            weapon.system.damage.die = die;
                        }
                    }
                    break;
                }
                default:
                    break;
            }
        }
    }

    static override createAttackModifiers({ item, domains }: CreateAttackModifiersParams): Modifier[] {
        const actor = item.actor;
        if (!actor) throw ErrorPF2e("The weapon must be embedded");

        const traitsAndTags = [item.system.traits.value, item.system.traits.otherTags].flat().filter(R.isTruthy);
        const synthetics = actor.synthetics.modifierAdjustments;

        const pcSpecificModifiers = traitsAndTags.flatMap((trait) => {
            const unannotatedTrait = this.getUnannotatedTrait(trait);
            switch (unannotatedTrait) {
                case "kickback": {
                    // (pre-remaster language)
                    // "Firing a kickback weapon gives a –2 circumstance penalty to the attack roll, but characters with
                    // 14 or more Strength ignore the penalty."
                    return new Modifier({
                        slug: unannotatedTrait,
                        label: CONFIG.PF2E.weaponTraits.kickback,
                        modifier: -2,
                        type: "circumstance",
                        predicate: new Predicate({ lt: ["attribute:str:mod", 2] }),
                        adjustments: extractModifierAdjustments(synthetics, domains, unannotatedTrait),
                    });
                }
                case "improvised": {
                    return new Modifier({
                        slug: unannotatedTrait,
                        label: this.getLabel(trait),
                        modifier: -2,
                        type: "item",
                        predicate: new Predicate({ not: "self:ignore-improvised-penalty" }),
                        adjustments: extractModifierAdjustments(synthetics, domains, unannotatedTrait),
                    });
                }
                default:
                    return [];
            }
        });

        return [...super.createAttackModifiers({ item, domains }), ...pcSpecificModifiers];
    }
}

/** Make a PC Clumsy 1 when wielding an oversized weapon */
function imposeOversizedWeaponCondition(actor: CharacterPF2e): void {
    if (actor.conditions.clumsy) return;

    const wieldedOversizedWeapon = actor.itemTypes.weapon.find(
        (w) => w.isEquipped && w.isOversized && w.category !== "unarmed",
    );
    const compendiumCondition = game.pf2e.ConditionManager.getCondition("clumsy");
    const conditionSource =
        wieldedOversizedWeapon && actor.conditions.bySlug("clumsy").length === 0
            ? fu.mergeObject(compendiumCondition.toObject(), {
                  _id: "xxxxOVERSIZExxxx",
                  system: { slug: "clumsy", references: { parent: { id: wieldedOversizedWeapon.id } } },
              })
            : null;
    if (!conditionSource) return;

    const clumsyOne = new ItemProxyPF2e(conditionSource, { parent: actor }) as ConditionPF2e<CharacterPF2e>;
    clumsyOne.prepareSiblingData();
    clumsyOne.prepareActorData();
    for (const rule of clumsyOne.prepareRuleElements()) {
        rule.beforePrepareData?.();
    }
    actor.conditions.set(clumsyOne.id, clumsyOne);
}

interface CreateAttackModifiersParams {
    item: AbilityItemPF2e<CharacterPF2e> | WeaponPF2e<CharacterPF2e>;
    domains: string[];
}

/** Get the proficiency rank of of a weapon or armor for a PC. */
function getItemProficiencyRank(
    actor: CharacterPF2e,
    item: ArmorPF2e | WeaponPF2e,
    itemOptions = new Set(item.getRollOptions("item")),
): ZeroToFour {
    if (item.isOfType("armor")) return getArmorProficiencyRank(actor, item, itemOptions);
    return getWeaponProficiencyRank(actor, item, itemOptions);
}

function getArmorProficiencyRank(actor: CharacterPF2e, armor: ArmorPF2e, itemOptions: Set<string>): ZeroToFour {
    return Object.entries(actor.system.proficiencies.defenses as Record<string, MartialProficiency>)
        .filter(([key, proficiency]) => {
            if (!armor) return key === "unarmored";
            if (armor.category === key) return true;
            return proficiency.definition?.test(itemOptions) ?? false;
        })
        .map(([_k, v]) => v)
        .reduce((best, p) => (p.rank > best.rank ? p : best), { rank: 0 as ZeroToFour }).rank;
}

function getWeaponProficiencyRank(actor: CharacterPF2e, weapon: WeaponPF2e, itemOptions: Set<string>): ZeroToFour {
    // If the character has an ancestral weapon familiarity or similar feature, it will make weapons that meet
    // certain criteria also count as weapon of different category
    const proficiencies = actor.system.proficiencies;
    const categoryRank = proficiencies.attacks[weapon.category]?.rank ?? 0;
    const groupRank = proficiencies.attacks[`weapon-group-${weapon.group}`]?.rank ?? 0;

    // Weapons that are interchangeable for all rules purposes (e.g., longbow and composite longbow)
    const equivalentWeapons: Record<string, string | undefined> = CONFIG.PF2E.equivalentWeapons;
    const baseWeapon = equivalentWeapons[weapon.baseType ?? ""] ?? weapon.baseType;
    const baseWeaponRank = proficiencies.attacks[`weapon-base-${baseWeapon}`]?.rank ?? 0;
    const syntheticRanks = Object.values(proficiencies.attacks)
        .filter((p): p is MartialProficiency => !!p?.definition?.test(itemOptions))
        .map((p) => p.rank);

    return Math.max(categoryRank, groupRank, baseWeaponRank, ...syntheticRanks) as ZeroToFour;
}

/** Create a penalty for attempting to Force Open without a crowbar or equivalent tool */
function createForceOpenPenalty(actor: CharacterPF2e, domains: string[]): Modifier {
    const slug = "no-crowbar";
    const { modifierAdjustments } = actor.synthetics;
    return new Modifier({
        slug,
        label: "PF2E.Actions.ForceOpen.NoCrowbarPenalty",
        type: "item",
        modifier: -2,
        predicate: ["action:force-open", "action:force-open:prying"],
        hideIfDisabled: true,
        adjustments: extractModifierAdjustments(modifierAdjustments, domains, slug),
    });
}

function createShoddyPenalty(
    actor: ActorPF2e,
    item: WeaponPF2e | ArmorPF2e | null,
    domains: string[],
): Modifier | null {
    if (!actor.isOfType("character") || !item?.isShoddy) return null;

    const slug = "shoddy";

    return new Modifier({
        label: "PF2E.Item.Physical.OtherTag.Shoddy",
        type: "item",
        slug,
        modifier: -2,
        adjustments: extractModifierAdjustments(actor.synthetics.modifierAdjustments, domains, slug),
    });
}

/**
 * Create a penalty for wearing armor with the "ponderous" trait
 * "While wearing the armor, you take a –1 penalty to initiative checks. If you don't meet the armor's required Strength
 * score, this penalty increases to be equal to the armor's check penalty if it's worse."
 */
function createPonderousPenalty(actor: CharacterPF2e): Modifier | null {
    const armor = actor.wornArmor;
    const slug = "ponderous";
    if (!armor?.traits.has(slug)) return null;

    const penaltyValue = actor.abilities.str.mod >= (armor.strength ?? -Infinity) ? -1 : armor.checkPenalty || -1;

    return new Modifier({
        label: "PF2E.TraitPonderous",
        type: "untyped",
        slug,
        modifier: penaltyValue,
        adjustments: extractModifierAdjustments(actor.synthetics.modifierAdjustments, ["all", "initiative"], slug),
    });
}

function getWeaponAuxiliaryActions(weapon: WeaponPF2e<CharacterPF2e>): WeaponAuxiliaryAction[] {
    const actor = weapon.actor;
    const auxiliaryActions: WeaponAuxiliaryAction[] = [];
    const isRealItem = actor.items.has(weapon.id);
    const traitsArray = weapon.system.traits.value;

    if (weapon.system.traits.toggles.modular.options.length > 0) {
        auxiliaryActions.push(new WeaponAuxiliaryAction({ weapon, action: "interact", annotation: "modular" }));
    }
    if (weapon.isEquipped) {
        if (traitsArray.includes("parry") && !actor.rollOptions.all["self:effect:parry"]) {
            auxiliaryActions.push(new WeaponAuxiliaryAction({ weapon, action: "parry" }));
        }
    }

    if (isRealItem && weapon.category !== "unarmed" && !weapon.parentItem) {
        const usage = weapon.system.usage;
        const weaponAsShield = weapon.shield;
        const canWield2H =
            usage.hands === 2 ||
            (usage.hands === 1 && actor.handsFree > 0 && !!weaponAsShield) ||
            traitsArray.some((t) => t.startsWith("fatal-aim")) ||
            traitsArray.some((t) => t.startsWith("two-hand"));

        switch (weapon.carryType) {
            case "held": {
                if (weaponAsShield) {
                    const hasShieldRaised = !!actor.rollOptions.all["self:effect:raise-a-shield"];
                    const hasGreaterCover = !!actor.rollOptions.all["self:cover-level:greater"];
                    if (!hasShieldRaised) {
                        auxiliaryActions.push(new WeaponAuxiliaryAction({ weapon, action: "raise-a-shield" }));
                    } else if (weaponAsShield.isTowerShield && weaponAsShield.isRaised) {
                        const action = hasGreaterCover ? "end-cover" : "take-cover";
                        const annotation = "tower-shield";
                        auxiliaryActions.push(new WeaponAuxiliaryAction({ weapon, action, annotation }));
                    }
                }

                if (weapon.handsHeld === 2) {
                    auxiliaryActions.push(
                        new WeaponAuxiliaryAction({ weapon, action: "release", annotation: "grip", hands: 1 }),
                    );
                } else if (weapon.handsHeld === 1 && canWield2H) {
                    auxiliaryActions.push(
                        new WeaponAuxiliaryAction({ weapon, action: "interact", annotation: "grip", hands: 2 }),
                    );
                }
                auxiliaryActions.push(
                    new WeaponAuxiliaryAction({ weapon, action: "interact", annotation: "sheathe", hands: 0 }),
                );
                auxiliaryActions.push(
                    new WeaponAuxiliaryAction({ weapon, action: "release", annotation: "drop", hands: 0 }),
                );

                break;
            }
            case "worn": {
                auxiliaryActions.push(
                    new WeaponAuxiliaryAction({ weapon, action: "interact", annotation: "draw", hands: 1 }),
                );
                if (canWield2H) {
                    auxiliaryActions.push(
                        new WeaponAuxiliaryAction({ weapon, action: "interact", annotation: "draw", hands: 2 }),
                    );
                }
                break;
            }
            case "stowed": {
                auxiliaryActions.push(
                    new WeaponAuxiliaryAction({ weapon, action: "interact", annotation: "retrieve", hands: 1 }),
                );
                break;
            }
            case "dropped": {
                auxiliaryActions.push(
                    new WeaponAuxiliaryAction({ weapon, action: "interact", annotation: "pick-up", hands: 1 }),
                );
                if (canWield2H) {
                    auxiliaryActions.push(
                        new WeaponAuxiliaryAction({ weapon, action: "interact", annotation: "pick-up", hands: 2 }),
                    );
                }
                break;
            }
        }
    }

    return auxiliaryActions;
}

/**
 * Returns data for usable ammo if the weapon requires ammo.
 * Built in ammo will require special handling, and isn't supported yet.
 */
function getAttackAmmo(
    weapon: WeaponPF2e<CharacterPF2e>,
    { ammos }: { ammos: (AmmoPF2e<CharacterPF2e> | WeaponPF2e<CharacterPF2e>)[] },
): AttackAmmunitionData | null {
    if (!weapon.system.expend) return null;

    const ammo = weapon.ammo;
    const compatible = ammos.filter((a) => a.isAmmoFor(weapon));
    const selected = ammo ? { id: ammo.id, compatible: ammo.isAmmoFor(weapon) } : null;
    const loaded = getLoadedAmmo(weapon);
    const capacity = weapon.system.ammo?.capacity ?? 0;
    const magsDepleted = loaded.every((a) => a.isOfType("ammo") && a.isMagazine && a.system.uses.value === 0);
    const remaining = magsDepleted ? 1 : Math.max(0, capacity - R.sumBy(loaded, (l) => l.quantity));

    // Get reload glyph. Repeating weapons always take 3 actions total
    const numActions = weapon.system.traits.value.includes("repeating") ? 3 : Number(weapon.reload);
    const reloadGlyph = numActions > 0 && Number.isInteger(numActions) ? getActionGlyph(numActions) : null;

    return {
        compatible: compatible.map((a) => ({ id: a.id, label: `${a.name} (${a.quantity})` })),
        selected,
        loaded: loaded.map((ammo) => {
            // A magazine can have max uses 1, but in those cases the quantity would be the same
            const isMagazine = ammo.isOfType("ammo") && ammo.system.uses.max > 1;
            return {
                ...R.pick(ammo, ["id", "name", "img"]),
                quantity: isMagazine ? ammo.system.uses.value : ammo.quantity,
                max: isMagazine ? ammo.system.uses.max : remaining + ammo.quantity,
                isTemporary: ammo.isTemporary,
            };
        }),
        // A repeating weapon may have reload 0, and still requires reloading
        requiresReload: weapon.reload !== "0" || weapon.system.traits.value.includes("repeating"),
        reloadGlyph,
        capacity,
        remaining,
    };
}

export {
    createForceOpenPenalty,
    createPonderousPenalty,
    createShoddyPenalty,
    getAttackAmmo,
    getItemProficiencyRank,
    getWeaponAuxiliaryActions,
    imposeOversizedWeaponCondition,
    PCAttackTraitHelpers,
};
