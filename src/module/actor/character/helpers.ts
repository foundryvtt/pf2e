import type { ActorPF2e, CharacterPF2e } from "@actor";
import { AttackTraitHelpers } from "@actor/creature/helpers.ts";
import { ModifierPF2e } from "@actor/modifiers.ts";
import type { AbilityItemPF2e, ArmorPF2e, ConditionPF2e, WeaponPF2e } from "@item";
import { EffectPF2e, ItemProxyPF2e } from "@item";
import { ItemCarryType } from "@item/physical/index.ts";
import { toggleWeaponTrait } from "@item/weapon/helpers.ts";
import { ChatMessagePF2e } from "@module/chat-message/document.ts";
import { ZeroToThree, ZeroToTwo } from "@module/data.ts";
import { extractModifierAdjustments } from "@module/rules/helpers.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { SheetOptions, createSheetOptions } from "@module/sheet/helpers.ts";
import { DAMAGE_DIE_FACES } from "@system/damage/values.ts";
import { PredicatePF2e } from "@system/predication.ts";
import {
    ErrorPF2e,
    getActionGlyph,
    objectHasKey,
    setHasElement,
    sluggify,
    traitSlugToObject,
    tupleHasValue,
} from "@util";
import * as R from "remeda";

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

    static override createAttackModifiers({ item, domains }: CreateAttackModifiersParams): ModifierPF2e[] {
        const { actor } = item;
        if (!actor) throw ErrorPF2e("The weapon must be embedded");

        const traitsAndTags = R.compact([item.system.traits.value, item.system.traits.otherTags].flat());
        const synthetics = actor.synthetics.modifierAdjustments;

        const pcSpecificModifiers = traitsAndTags.flatMap((trait) => {
            const unannotatedTrait = this.getUnannotatedTrait(trait);
            switch (unannotatedTrait) {
                case "kickback": {
                    // (pre-remaster language)
                    // "Firing a kickback weapon gives a –2 circumstance penalty to the attack roll, but characters with
                    // 14 or more Strength ignore the penalty."
                    return new ModifierPF2e({
                        slug: unannotatedTrait,
                        label: CONFIG.PF2E.weaponTraits.kickback,
                        modifier: -2,
                        type: "circumstance",
                        predicate: new PredicatePF2e({ lt: ["attribute:str:mod", 2] }),
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

        return [...super.createAttackModifiers({ item }), ...pcSpecificModifiers];
    }
}

interface AuxiliaryInteractParams {
    weapon: WeaponPF2e<CharacterPF2e>;
    action: "interact";
    annotation: "draw" | "grip" | "modular" | "pick-up" | "retrieve" | "sheathe";
    hands?: ZeroToTwo;
}

interface AuxiliaryShieldParams {
    weapon: WeaponPF2e<CharacterPF2e>;
    action: "end-cover" | "raise-a-shield" | "take-cover";
    annotation?: "tower-shield";
    hands?: never;
}

interface AuxiliaryReleaseParams {
    weapon: WeaponPF2e<CharacterPF2e>;
    action: "release";
    annotation: "grip" | "drop";
    hands: 0 | 1;
}

type AuxiliaryActionParams = AuxiliaryInteractParams | AuxiliaryShieldParams | AuxiliaryReleaseParams;
type AuxiliaryActionType = AuxiliaryActionParams["action"];
type AuxiliaryActionPurpose = AuxiliaryActionParams["annotation"];

/** Create an "auxiliary" action, an Interact or Release action using a weapon */
class WeaponAuxiliaryAction {
    readonly weapon: WeaponPF2e<CharacterPF2e>;
    readonly action: AuxiliaryActionType;
    readonly actions: ZeroToThree;
    readonly carryType: ItemCarryType | null;
    readonly hands: ZeroToTwo | null;
    readonly annotation: NonNullable<AuxiliaryActionPurpose> | null;
    /** A "full purpose" reflects the options to draw, sheathe, etc. a weapon */
    readonly fullAnnotation: string | null;

    constructor({ weapon, action, annotation, hands }: AuxiliaryActionParams) {
        this.weapon = weapon;
        this.action = action;
        this.annotation = annotation ?? null;
        this.hands = hands ?? null;

        type ActionCostCarryTypePurpose = [ZeroToThree, ItemCarryType | null, string | null];
        const [actions, carryType, fullPurpose] = ((): ActionCostCarryTypePurpose => {
            switch (annotation) {
                case "draw":
                    return [1, "held", `${annotation}${hands}H`];
                case "pick-up":
                    return [1, "held", `${annotation}${hands}H`];
                case "retrieve": {
                    const { container } = weapon;
                    if (container?.isHeld) return [1, "held", `${annotation}${hands}H`];
                    const usage = container?.system.usage;
                    const actionCost = usage?.type === "held" || usage?.where === "backpack" ? 2 : 1;
                    return [actionCost, "held", `${annotation}${hands}H`];
                }
                case "grip":
                    return [action === "interact" ? 1 : 0, "held", annotation];
                case "sheathe":
                    return [1, "worn", annotation];
                case "modular":
                    return [1, null, annotation];
                case "drop":
                    return [0, "dropped", annotation];
                case "tower-shield": {
                    const cost = this.action === "take-cover" ? 1 : 0;
                    return [cost, null, null];
                }
                default:
                    return [1, null, null];
            }
        })();

        this.actions = actions;
        this.carryType = carryType;
        this.fullAnnotation = fullPurpose;
    }

    get actor(): CharacterPF2e {
        return this.weapon.parent;
    }

    get label(): string {
        const actionKey = sluggify(this.action, { camel: "bactrian" });
        const purposeKey = this.fullAnnotation ? sluggify(this.fullAnnotation, { camel: "bactrian" }) : null;
        return purposeKey
            ? game.i18n.localize(`PF2E.Actions.${actionKey}.${purposeKey}.Title`)
            : game.i18n.localize(`PF2E.Actions.${actionKey}.ShortTitle`);
    }

    get glyph(): string {
        return getActionGlyph(this.actions);
    }

    get options(): SheetOptions | null {
        if (this.annotation === "modular") {
            return createSheetOptions(
                R.pick(CONFIG.PF2E.damageTypes, this.weapon.system.traits.toggles.modular.options),
                [this.weapon.system.traits.toggles.modular.selection ?? []].flat(),
            );
        }
        return null;
    }

    async execute({ selection = null }: { selection?: string | null } = {}): Promise<void> {
        const { actor, weapon } = this;
        const COVER_UUID = "Compendium.pf2e.other-effects.Item.I9lfZUiCwMiGogVi";

        if (this.carryType) {
            await actor.adjustCarryType(this.weapon, { carryType: this.carryType, handsHeld: this.hands ?? 0 });
        } else if (selection && tupleHasValue(weapon.system.traits.toggles.modular.options, selection)) {
            const updated = await toggleWeaponTrait({ weapon, trait: "modular", selection });
            if (!updated) return;
        } else if (this.action === "raise-a-shield") {
            // Apply Effect: Raise a Shield
            const alreadyRaised = actor.itemTypes.effect.some((e) => e.slug === "raise-a-shield");
            if (alreadyRaised) return;
            const effect = await fromUuid("Compendium.pf2e.equipment-effects.Item.2YgXoHvJfrDHucMr");
            if (effect instanceof EffectPF2e) {
                await actor.createEmbeddedDocuments("Item", [{ ...effect.toObject(), _id: null }]);
            }
        } else if (this.action === "take-cover") {
            // Apply Effect: Cover with a greater-cover selection
            const effect = await fromUuid(COVER_UUID);
            if (effect instanceof EffectPF2e) {
                const data = { ...effect.toObject(), _id: null };
                data.system.traits.otherTags.push("tower-shield");
                type ChoiceSetSource = RuleElementSource & { selection?: unknown };
                const rule = data.system.rules.find((r): r is ChoiceSetSource => r.key === "ChoiceSet");
                if (rule) rule.selection = { bonus: 4, level: "greater" };
                await actor.createEmbeddedDocuments("Item", [data]);
            }
        } else if (this.action === "end-cover") {
            await actor.itemTypes.effect.find((e) => e.sourceId === COVER_UUID)?.delete();
        }

        if (!game.combat) return; // Only send out messages if in encounter mode

        const templates = {
            flavor: "./systems/pf2e/templates/chat/action/flavor.hbs",
            content: "./systems/pf2e/templates/chat/action/content.hbs",
        };

        const actionKey = sluggify(this.action, { camel: "bactrian" });
        const annotationKey = this.annotation ? sluggify(this.annotation, { camel: "bactrian" }) : null;
        const fullAnnotationKey = this.fullAnnotation ? sluggify(this.fullAnnotation, { camel: "bactrian" }) : null;
        const flavorAction = {
            title: `PF2E.Actions.${actionKey}.Title`,
            subtitle: fullAnnotationKey ? `PF2E.Actions.${actionKey}.${fullAnnotationKey}.Title` : null,
            glyph: this.glyph,
        };

        const [traits, message] =
            this.action === "raise-a-shield"
                ? [[], `PF2E.Actions.${actionKey}.Content`]
                : ["take-cover", "end-cover"].includes(this.action)
                  ? [[], `PF2E.Actions.${actionKey}.${annotationKey}.Description`]
                  : [
                        [traitSlugToObject("manipulate", CONFIG.PF2E.actionTraits)],
                        `PF2E.Actions.${actionKey}.${fullAnnotationKey}.Description`,
                    ];

        const flavor = await renderTemplate(templates.flavor, { action: flavorAction, traits });

        const content = await renderTemplate(templates.content, {
            imgPath: weapon.img,
            message: game.i18n.format(message, {
                actor: actor.name,
                weapon: weapon.name,
                shield: weapon.shield?.name ?? weapon.name,
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
    domains: string[],
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

    const penaltyValue = actor.abilities.str.mod >= (armor.strength ?? -Infinity) ? -1 : armor.checkPenalty || -1;

    return new ModifierPF2e({
        label: "PF2E.TraitPonderous",
        type: "untyped",
        slug,
        modifier: penaltyValue,
        adjustments: extractModifierAdjustments(actor.synthetics.modifierAdjustments, ["all", "initiative"], slug),
    });
}

export {
    PCAttackTraitHelpers,
    WeaponAuxiliaryAction,
    createForceOpenPenalty,
    createHinderingPenalty,
    createPonderousPenalty,
    createShoddyPenalty,
    imposeOversizedWeaponCondition,
};
