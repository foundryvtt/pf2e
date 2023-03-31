import { StrikeAttackTraits } from "@actor/creature/helpers";
import { ModifierPF2e } from "@actor/modifiers";
import { ArmorPF2e, ConditionPF2e, WeaponPF2e } from "@item";
import { extractModifierAdjustments } from "@module/rules/helpers";
import { DAMAGE_DIE_FACES } from "@system/damage/values";
import { PredicatePF2e } from "@system/predication";
import { ErrorPF2e, objectHasKey, setHasElement } from "@util";
import { type CharacterPF2e } from ".";
import clumsySource from "../../../../packs/data/conditions.db/clumsy.json";

/** Handle weapon traits that introduce modifiers or add other weapon traits */
class PCStrikeAttackTraits extends StrikeAttackTraits {
    static adjustWeapon(weapon: WeaponPF2e): void {
        const traits = weapon.system.traits.value;
        for (const trait of [...traits]) {
            switch (trait.replace(/-d?\d{1,3}$/, "")) {
                case "fatal-aim": {
                    if (weapon.rangeIncrement && weapon.handsHeld === 2) {
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
                        if (setHasElement(DAMAGE_DIE_FACES, die)) {
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

    static override createAttackModifiers({ weapon, domains }: CreateAttackModifiersParams): ModifierPF2e[] {
        const { actor } = weapon;
        if (!actor) throw ErrorPF2e("The weapon must be embedded");

        const traitsAndTags = [weapon.system.traits.value, weapon.system.traits.otherTags].flat();
        const synthetics = actor.synthetics.modifierAdjustments;

        const pcSpecificModifiers = traitsAndTags.flatMap((trait) => {
            const unannotatedTrait = this.getUnannotatedTrait(trait);
            switch (unannotatedTrait) {
                case "kickback": {
                    // "Firing a kickback weapon gives a –2 circumstance penalty to the attack roll, but characters with
                    // 14 or more Strength ignore the penalty."
                    return new ModifierPF2e({
                        slug: unannotatedTrait,
                        label: CONFIG.PF2E.weaponTraits.kickback,
                        modifier: -2,
                        type: "circumstance",
                        predicate: new PredicatePF2e({ lt: ["ability:str:score", 14] }),
                        adjustments: extractModifierAdjustments(synthetics, domains, unannotatedTrait),
                    });
                }
                case "improvised": {
                    return new ModifierPF2e({
                        slug: unannotatedTrait,
                        label: this.getLabel(trait),
                        modifier: -2,
                        type: "item",
                        predicate: new PredicatePF2e({ not: "self:ignore-improvised-penalty" }),
                        adjustments: extractModifierAdjustments(synthetics, domains, unannotatedTrait),
                    });
                }
                default:
                    return [];
            }
        });

        return [...super.createAttackModifiers({ weapon }), ...pcSpecificModifiers];
    }
}

/** Make a PC Clumsy 1 when wielding an oversized weapon */
function imposeOversizedWeaponCondition(actor: CharacterPF2e): void {
    const wieldedOversizedWeapon = actor.itemTypes.weapon.find(
        (w) => w.isEquipped && w.isOversized && w.category !== "unarmed"
    );

    const conditionSource =
        wieldedOversizedWeapon && actor.conditions.bySlug("clumsy").length === 0
            ? mergeObject(
                  clumsySource,
                  {
                      _id: "xxxxOVERSIZExxxx",
                      name: game.i18n.localize(CONFIG.PF2E.statusEffects.conditions.clumsy),
                      system: { slug: "clumsy", references: { parent: { id: wieldedOversizedWeapon.id } } },
                  },
                  { inplace: false }
              )
            : null;
    if (!conditionSource) return;

    const clumsyOne = new ConditionPF2e(conditionSource, { parent: actor });
    clumsyOne.prepareSiblingData();
    clumsyOne.prepareActorData();
    for (const rule of clumsyOne.prepareRuleElements()) {
        rule.beforePrepareData?.();
    }
}

interface CreateAttackModifiersParams {
    weapon: WeaponPF2e;
    domains: string[];
}

/** Create a penalty for attempting to Force Open without a crowbar or equivalent tool */
function createForceOpenPenalty(actor: CharacterPF2e, domains: string[]): ModifierPF2e {
    const slug = "no-crowbar";
    const { modifierAdjustments } = actor.synthetics;
    return new ModifierPF2e({
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
    actor: CharacterPF2e,
    item: WeaponPF2e | ArmorPF2e,
    domains: string[]
): ModifierPF2e | null {
    if (!item.isShoddy) return null;

    const slug = "shoddy";
    const { modifierAdjustments } = actor.synthetics;
    return new ModifierPF2e({
        label: "PF2E.Item.Physical.OtherTag.Shoddy",
        type: "item",
        slug,
        modifier: -2,
        adjustments: extractModifierAdjustments(modifierAdjustments, domains, slug),
    });
}

export { createForceOpenPenalty, createShoddyPenalty, imposeOversizedWeaponCondition, PCStrikeAttackTraits };
