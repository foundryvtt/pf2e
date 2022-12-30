import { CharacterPF2e, NPCPF2e } from "@actor";
import { EffectPF2e } from "@item";
import { ChatMessagePF2e } from "@module/chat-message";
import { ActionDefaultOptions } from "@system/action-macros";
import { LocalizePF2e } from "@system/localize";
import { ErrorPF2e } from "@util";

/** Effect: Raise a Shield */
const ITEM_UUID = "Compendium.pf2e.equipment-effects.2YgXoHvJfrDHucMr";

const TEMPLATES = {
    flavor: "./systems/pf2e/templates/chat/action/flavor.hbs",
    content: "./systems/pf2e/templates/chat/action/content.hbs",
};

/** A macro for the Raise a Shield action */
export async function raiseAShield(options: ActionDefaultOptions): Promise<void> {
    const translations = LocalizePF2e.translations.PF2E.Actions.RaiseAShield;

    const actors = Array.isArray(options.actors) ? options.actors : [options.actors];
    const actor = actors[0];
    if (actors.length > 1 || !(actor instanceof CharacterPF2e || actor instanceof NPCPF2e)) {
        ui.notifications.error(translations.BadArgs);
        return;
    }

    const shield = actor.heldShield;
    const speaker = ChatMessagePF2e.getSpeaker({ actor: actor });

    const isSuccess = await (async (): Promise<boolean> => {
        const existingEffect = actor.itemTypes.effect.find((e) => e.flags.core?.sourceId === ITEM_UUID);
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
            ui.notifications.warn(
                game.i18n.format(translations.ShieldIsBroken, { actor: speaker.alias, shield: shield.name })
            );
            return false;
        } else {
            ui.notifications.warn(game.i18n.format(translations.NoShieldEquipped, { actor: speaker.alias }));
            return false;
        }
    })();

    if (isSuccess) {
        const combatActor = (game.combat?.started && game.combat.combatant?.actor) || null;
        const [actionType, glyph] =
            combatActor && combatActor !== actor ? (["Reaction", "R"] as const) : (["SingleAction", "1"] as const);

        const title = translations[`${actionType}Title` as const];

        const content = await renderTemplate(TEMPLATES.content, {
            imgPath: shield!.img,
            message: game.i18n.format(translations.Content, { actor: speaker.alias }),
        });
        const flavor = await renderTemplate(TEMPLATES.flavor, {
            action: { title, typeNumber: glyph },
        });

        await ChatMessagePF2e.create({
            type: CONST.CHAT_MESSAGE_TYPES.EMOTE,
            speaker,
            flavor,
            content,
        });
    }
}
