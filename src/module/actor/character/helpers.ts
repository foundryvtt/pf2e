import { StrikeAttackTraits } from "@actor/creature/helpers.ts";
import { ModifierPF2e } from "@actor/modifiers.ts";
import { ArmorPF2e, ConditionPF2e, WeaponPF2e } from "@item";
import { ItemCarryType } from "@item/physical/index.ts";
import { toggleWeaponTrait } from "@item/weapon/helpers.ts";
import { ZeroToThree, ZeroToTwo } from "@module/data.ts";
import { ActorPF2e, ChatMessagePF2e } from "@module/documents.ts";
import { extractModifierAdjustments } from "@module/rules/helpers.ts";
import { SheetOptions, createSheetOptions } from "@module/sheet/helpers.ts";
import { DAMAGE_DIE_FACES } from "@system/damage/values.ts";
import { PredicatePF2e } from "@system/predication.ts";
import { ErrorPF2e, getActionGlyph, objectHasKey, pick, setHasElement, tupleHasValue } from "@util";
import clumsySource from "../../../../packs/conditions/clumsy.json";
import type { CharacterPF2e } from "./document.ts";

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

interface AuxiliaryInteractParams {
    weapon: WeaponPF2e<CharacterPF2e>;
    action: "Interact";
    purpose: "Draw" | "Grip" | "Modular" | "PickUp" | "Retrieve" | "Sheathe";
    hands?: ZeroToTwo;
}

interface AuxiliaryReleaseParams {
    weapon: WeaponPF2e<CharacterPF2e>;
    action: "Release";
    purpose: "Grip" | "Drop";
    hands: 0 | 1;
}

type AuxiliaryActionParams = AuxiliaryInteractParams | AuxiliaryReleaseParams;
type AuxiliaryActionPurpose = AuxiliaryActionParams["purpose"];

/** Create an "auxiliary" action, an Interact or Release action using a weapon */
class WeaponAuxiliaryAction {
    readonly weapon: WeaponPF2e<CharacterPF2e>;
    readonly action: "Interact" | "Release";
    readonly actions: ZeroToThree;
    readonly carryType: ItemCarryType | null;
    readonly hands: ZeroToThree | null;
    readonly purpose: AuxiliaryActionPurpose;
    /** A "full purpose" reflects the options to draw, sheathe, etc. a weapon */
    readonly fullPurpose: string;

    constructor({ weapon, action, purpose, hands }: AuxiliaryActionParams) {
        this.weapon = weapon;
        this.action = action;
        this.purpose = purpose;
        this.hands = hands ?? null;

        type ActionsCarryTypePurpose = [ZeroToThree, ItemCarryType, string] | [1, null, "Modular"];
        const [actions, carryType, fullPurpose] = ((): ActionsCarryTypePurpose => {
            switch (purpose) {
                case "Draw":
                    return [1, "held", `${purpose}${hands}H`];
                case "PickUp":
                    return [1, "held", `${purpose}${hands}H`];
                case "Retrieve":
                    return [weapon.container?.isHeld ? 2 : 3, "held", `${purpose}${hands}H`];
                case "Grip":
                    return [action === "Interact" ? 1 : 0, "held", purpose];
                case "Sheathe":
                    return [1, "worn", purpose];
                case "Modular":
                    return [1, null, purpose];
                case "Drop":
                    return [0, "dropped", purpose];
            }
        })();

        this.actions = actions;
        this.carryType = carryType;
        this.fullPurpose = fullPurpose;
    }

    get actor(): CharacterPF2e {
        return this.weapon.parent;
    }

    get label(): string {
        return game.i18n.localize(`PF2E.Actions.${this.action}.${this.fullPurpose}.Title`);
    }

    get glyph(): string {
        return getActionGlyph(this.actions);
    }

    get options(): SheetOptions | null {
        if (this.purpose === "Modular") {
            return createSheetOptions(
                pick(CONFIG.PF2E.damageTypes, this.weapon.system.traits.toggles.modular.options),
                [this.weapon.system.traits.toggles.modular.selection ?? []].flat()
            );
        }
        return null;
    }

    async execute({ selection = null }: { selection?: string | null } = {}): Promise<void> {
        const { actor, weapon } = this;
        if (typeof this.carryType === "string") {
            actor.adjustCarryType(this.weapon, { carryType: this.carryType, handsHeld: this.hands ?? 0 });
        } else if (selection && tupleHasValue(weapon.system.traits.toggles.modular.options, selection)) {
            const updated = await toggleWeaponTrait({ weapon, trait: "modular", selection });
            if (!updated) return;
        }

        if (!game.combat) return; // Only send out messages if in encounter mode

        const templates = {
            flavor: "./systems/pf2e/templates/chat/action/flavor.hbs",
            content: "./systems/pf2e/templates/chat/action/content.hbs",
        };

        const flavorAction = {
            title: `PF2E.Actions.${this.action}.Title`,
            subtitle: `PF2E.Actions.${this.action}.${this.fullPurpose}.Title`,
            typeNumber: this.glyph,
        };

        const flavor = await renderTemplate(templates.flavor, {
            action: flavorAction,
            traits: [
                {
                    name: CONFIG.PF2E.featTraits.manipulate,
                    description: CONFIG.PF2E.traitsDescriptions.manipulate,
                },
            ],
        });

        const content = await renderTemplate(templates.content, {
            imgPath: weapon.img,
            message: game.i18n.format(`PF2E.Actions.${this.action}.${this.fullPurpose}.Description`, {
                actor: actor.name,
                weapon: weapon.name,
                damageType: game.i18n.localize(`PF2E.Damage.RollFlavor.${selection}`),
            }),
        });

        const token = actor.getActiveTokens(false, true).shift();

        await ChatMessagePF2e.create({
            content,
            speaker: ChatMessagePF2e.getSpeaker({ actor, token }),
            flavor,
            type: CONST.CHAT_MESSAGE_TYPES.EMOTE,
        });
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
    actor: ActorPF2e,
    item: WeaponPF2e | ArmorPF2e | null,
    domains: string[]
): ModifierPF2e | null {
    if (!actor.isOfType("character") || !item?.isShoddy) return null;

    const slug = "shoddy";

    return new ModifierPF2e({
        label: "PF2E.Item.Physical.OtherTag.Shoddy",
        type: "item",
        slug,
        modifier: -2,
        adjustments: extractModifierAdjustments(actor.synthetics.modifierAdjustments, domains, slug),
    });
}

/**
 * Create a penalty for wearing armor with the "ponderous" trait
 * "You take a –5 penalty to all your Speeds (to a minimum of a 5-foot Speed). This is separate from and in addition to
 * the armor's Speed penalty, and affects you even if your Strength or an ability lets you reduce or ignore the armor's
 * Speed penalty."
 */
function createHinderingPenalty(actor: CharacterPF2e): ModifierPF2e | null {
    const slug = "hindering";
    return actor.wornArmor?.traits.has(slug)
        ? new ModifierPF2e({
              label: "PF2E.TraitHindering",
              type: "untyped",
              slug,
              modifier: -5,
              adjustments: [],
          })
        : null;
}

/**
 * Create a penalty for wearing armor with the "ponderous" trait
 * "While wearing the armor, you take a –1 penalty to initiative checks. If you don't meet the armor's required Strength
 * score, this penalty increases to be equal to the armor's check penalty if it's worse."
 */
function createPonderousPenalty(actor: CharacterPF2e): ModifierPF2e | null {
    const armor = actor.wornArmor;
    const slug = "ponderous";
    if (!armor?.traits.has(slug)) return null;

    const penaltyValue = actor.abilities.str.value >= (armor.strength ?? 0) ? -1 : armor.checkPenalty || -1;

    return new ModifierPF2e({
        label: "PF2E.TraitPonderous",
        type: "untyped",
        slug,
        modifier: penaltyValue,
        adjustments: extractModifierAdjustments(actor.synthetics.modifierAdjustments, ["all", "initiative"], slug),
    });
}

export {
    createForceOpenPenalty,
    createHinderingPenalty,
    createPonderousPenalty,
    createShoddyPenalty,
    imposeOversizedWeaponCondition,
    PCStrikeAttackTraits,
    WeaponAuxiliaryAction,
};
