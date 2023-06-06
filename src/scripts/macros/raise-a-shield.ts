import { ActorPF2e } from "@actor";
import { EffectPF2e } from "@item";
import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import { ActionDefaultOptions } from "@system/action-macros/index.ts";
import { ErrorPF2e, localizer } from "@util";

/** Effect: Raise a Shield */
const ITEM_UUID = "Compendium.pf2e.equipment-effects.Item.2YgXoHvJfrDHucMr";

const TEMPLATES = {
    flavor: "./systems/pf2e/templates/chat/action/flavor.hbs",
    content: "./systems/pf2e/templates/chat/action/content.hbs",
};

/** A macro for the Raise a Shield action */
export async function raiseAShield(options: ActionDefaultOptions): Promise<void> {
    const localize = localizer("PF2E.Actions.RaiseAShield");

    const actors = Array.isArray(options.actors) ? options.actors : [options.actors];
    const actor = actors[0];
    if (actors.length > 1 || !(actor && ["character", "npc"].includes(actor.type))) {
        ui.notifications.error(localize("BadArgs"));
        return;
    }

    const shield = actor.heldShield;
    const speaker = ChatMessagePF2e.getSpeaker({ actor });

    const isSuccess = await (async (): Promise<boolean> => {
        const effects: EffectPF2e<ActorPF2e>[] = actor.itemTypes.effect;
        const existingEffect = effects.find((e) => e.flags.core?.sourceId === ITEM_UUID);
        if (existingEffect) {
            await existingEffect.delete();
            return false;
        }

        if (shield?.isBroken === false) {
            const effect = await fromUuid(ITEM_UUID);
            if (!(effect instanceof EffectPF2e)) {
                throw ErrorPF2e("Raise a Shield effect not found");
            }
            await actor.createEmbeddedDocuments("Item", [effect.toObject()]);
            return true;
        } else if (shield?.isBroken) {
            ui.notifications.warn(localize("ShieldIsBroken", { actor: speaker.alias, shield: shield.name }));
            return false;
        } else {
            ui.notifications.warn(localize("NoShieldEquipped", { actor: speaker.alias }));
            return false;
        }
    })();

    if (isSuccess) {
        const combatActor = (game.combat?.started && game.combat.combatant?.actor) || null;
        const [actionType, glyph] =
            combatActor && combatActor !== actor ? (["Reaction", "R"] as const) : (["SingleAction", "1"] as const);

        const content = await renderTemplate(TEMPLATES.content, {
            imgPath: shield!.img,
            message: localize("Content", { actor: speaker.alias }),
        });
        const flavor = await renderTemplate(TEMPLATES.flavor, {
            action: { title: localize(`${actionType}Title`), typeNumber: glyph },
        });

        await ChatMessagePF2e.create({
            type: CONST.CHAT_MESSAGE_TYPES.EMOTE,
            speaker,
            flavor,
            content,
        });
    }
}
