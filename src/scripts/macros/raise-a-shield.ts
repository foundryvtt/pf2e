import { CharacterPF2e } from '@actor/character';
import { NPCPF2e } from '@actor/npc';
import { EffectPF2e } from '@item/effect';
import { ChatMessagePF2e } from '@module/chat-message';
import { ErrorPF2e } from '@module/utils';
import { ActionDefaultOptions } from '../..//module/system/actions/actions';
import { LocalizePF2e } from '../../module/system/localize';

/** Effect: Raise a Shield */
const ITEM_UUID = 'Compendium.pf2e.equipment-effects.2YgXoHvJfrDHucMr';

const TEMPLATES = {
    flavor: './systems/pf2e/templates/chat/action/flavor.html',
    content: './systems/pf2e/templates/chat/action/content.html',
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
        const existingEffect = actor.itemTypes.effect.find(
            (effect) => effect.getFlag('core', 'sourceId') === ITEM_UUID,
        );
        if (existingEffect) {
            await existingEffect.delete();
            return false;
        }

        if (shield?.isBroken === false) {
            const effect = await fromUuid(ITEM_UUID);
            if (!(effect instanceof EffectPF2e)) {
                throw ErrorPF2e('Raise a Shield effect not found');
            }
            const effectSource = effect.toObject();
            effectSource.img = shield.img;
            const rule = effectSource.data.rules.find(
                (rule) => rule.selector === 'ac' && rule.key === 'PF2E.RuleElement.FlatModifier',
            );
            rule!.value = shield.acBonus;
            await actor.createEmbeddedDocuments('Item', [effectSource]);
            return true;
        } else if (shield?.isBroken) {
            ui.notifications.warn(
                game.i18n.format(translations.ShieldIsBroken, { actor: speaker.alias, shield: shield.name }),
            );
            return false;
        } else {
            ui.notifications.warn(game.i18n.format(translations.NoShieldEquipped, { actor: speaker.alias }));
            return false;
        }
    })();

    if (isSuccess) {
        const combatActor = (game.combat?.active && game.combat.combatant?.actor) || null;
        const [actionType, glyph] =
            combatActor && combatActor !== actor ? (['Reaction', 'R'] as const) : (['SingleAction', '1'] as const);

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
