import { EffectPF2e, WeaponPF2e } from "@item";
import type { ItemCarryType } from "@item/physical/index.ts";
import { ChatMessagePF2e } from "@module/chat-message/document.ts";
import type { ZeroToThree, ZeroToTwo } from "@module/data.ts";
import type { RuleElementSource } from "@module/rules/index.ts";
import { SheetOptions, createSheetOptions } from "@module/sheet/helpers.ts";
import { getActionGlyph, sluggify, tupleHasValue } from "@util";
import { traitSlugToObject } from "@util/tags.ts";
import * as R from "remeda";
import { CharacterPF2e } from "./document.ts";

interface AuxiliaryInteractParams {
    weapon: WeaponPF2e<CharacterPF2e>;
    action: "interact";
    annotation: "draw" | "grip" | "modular" | "pick-up" | "retrieve" | "sheathe";
    hands?: ZeroToTwo;
}

interface AuxiliaryWeaponParryParams {
    weapon: WeaponPF2e<CharacterPF2e>;
    action: "parry";
    annotation?: never;
    hands?: never;
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

type AuxiliaryActionParams =
    | AuxiliaryInteractParams
    | AuxiliaryWeaponParryParams
    | AuxiliaryShieldParams
    | AuxiliaryReleaseParams;
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
            const toggles = this.weapon.system.traits.toggles;
            return createSheetOptions(
                R.pick(CONFIG.PF2E.damageTypes, toggles.modular.options),
                [toggles.modular.selected ?? []].flat(),
            );
        }
        return null;
    }

    /**
     * Execute an auxiliary action.
     * [options.selection] A choice of some kind: currently only has meaning for modular trait toggling
     */
    async execute({ selection = null }: { selection?: string | null } = {}): Promise<void> {
        const { actor, weapon } = this;
        const COVER_UUID = "Compendium.pf2e.other-effects.Item.I9lfZUiCwMiGogVi";

        if (this.carryType) {
            await actor.changeCarryType(this.weapon, { carryType: this.carryType, handsHeld: this.hands ?? 0 });
        } else if (selection && tupleHasValue(weapon.system.traits.toggles.modular.options, selection)) {
            const updated = await weapon.system.traits.toggles.update({ trait: "modular", selected: selection });
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
        } else if (this.action === "parry") {
            // Apply Effect: Parry
            const alreadyParrying = actor.itemTypes.effect.some((e) => e.slug === "parry");
            if (alreadyParrying) return;
            const effect = await fromUuid("Compendium.pf2e.equipment-effects.Item.fRlvmul3LbLo2xvR");
            if (effect instanceof EffectPF2e) {
                await actor.createEmbeddedDocuments("Item", [{ ...effect.toObject(), _id: null }]);
            }
        }

        if (!game.combat) return; // Only send out messages if in encounter mode

        const templates = {
            flavor: `./${SYSTEM_ROOT}/templates/chat/action/flavor.hbs`,
            content: `./${SYSTEM_ROOT}/templates/chat/action/content.hbs`,
        };

        const actionKey = sluggify(this.action, { camel: "bactrian" });
        const annotationKey = this.annotation ? sluggify(this.annotation, { camel: "bactrian" }) : null;
        const fullAnnotationKey = this.fullAnnotation ? sluggify(this.fullAnnotation, { camel: "bactrian" }) : null;
        const flavorAction = {
            title: `PF2E.Actions.${actionKey}.Title`,
            subtitle: fullAnnotationKey ? `PF2E.Actions.${actionKey}.${fullAnnotationKey}.Title` : null,
            glyph: this.glyph,
        };

        const [traits, message] = ["raise-a-shield", "parry"].includes(this.action)
            ? [[], `PF2E.Actions.${actionKey}.Content`]
            : ["take-cover", "end-cover"].includes(this.action)
              ? [[], `PF2E.Actions.${actionKey}.${annotationKey}.Description`]
              : [
                    [traitSlugToObject("manipulate", CONFIG.PF2E.actionTraits)],
                    `PF2E.Actions.${actionKey}.${fullAnnotationKey}.Description`,
                ];

        const flavor = await fa.handlebars.renderTemplate(templates.flavor, { action: flavorAction, traits });

        const content = await fa.handlebars.renderTemplate(templates.content, {
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
            style: CONST.CHAT_MESSAGE_STYLES.EMOTE,
        });
    }
}

export { WeaponAuxiliaryAction };
