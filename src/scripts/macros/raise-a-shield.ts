import { EffectPF2e } from "@item";
import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import type { ActionDefaultOptions } from "@system/action-macros/index.ts";
import { ErrorPF2e, localizer } from "@util";

/** Effect: Raise a Shield */
const ITEM_UUID = "Compendium.pf2e.equipment-effects.Item.2YgXoHvJfrDHucMr";

const TEMPLATES = {
    flavor: `./${SYSTEM_ROOT}/templates/chat/action/flavor.hbs`,
    content: `./${SYSTEM_ROOT}/templates/chat/action/content.hbs`,
};

/** A macro for the Raise a Shield action */
export async function raiseAShield(options: ActionDefaultOptions): Promise<void> {
    const localize = localizer("PF2E.Actions.RaiseAShield");

    const actors = Array.isArray(options.actors) ? options.actors : [options.actors];
    const actor = actors[0];
    if (actors.length > 1 || !actor?.isOfType("character", "npc")) {
        ui.notifications.error(localize("BadArgs"));
        return;
    }

    const existingEffect = actor.itemTypes.effect.find((e) => e.sourceId === ITEM_UUID);
    if (existingEffect) {
        await existingEffect.delete();
        return;
    }

    // Use auxiliary action from PCs
    if (actor.isOfType("character")) {
        const { heldShield } = actor;
        const shieldAction = actor.system.actions
            .find((a) => a.ready && !!a.item.shield && a.item.shield === heldShield)
            ?.auxiliaryActions.find((aux) => aux.action === "raise-a-shield");
        return shieldAction?.execute();
    }

    const shield = actor.heldShield;
    const speaker = ChatMessagePF2e.getSpeaker({ actor });

    const isSuccess = await (async (): Promise<boolean> => {
        if (shield?.isDestroyed) {
            ui.notifications.warn(localize("ShieldIsDestroyed", { actor: speaker.alias, shield: shield.name }));
            return false;
        } else if (shield?.isBroken === false) {
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

    if (shield && isSuccess) {
        const combatActor = (game.combat?.started && game.combat.combatant?.actor) || null;
        const [actionType, glyph] =
            combatActor && combatActor !== actor ? (["Reaction", "R"] as const) : (["SingleAction", "1"] as const);

        const content = await fa.handlebars.renderTemplate(TEMPLATES.content, {
            imgPath: shield.img,
            message: localize("Content", { actor: speaker.alias, shield: game.i18n.localize("TYPES.Item.shield") }),
        });
        const flavor = await fa.handlebars.renderTemplate(TEMPLATES.flavor, {
            action: { title: localize(`${actionType}Title`), glyph },
        });

        await ChatMessagePF2e.create({
            style: CONST.CHAT_MESSAGE_STYLES.EMOTE,
            speaker,
            flavor,
            content,
        });
    }
}
