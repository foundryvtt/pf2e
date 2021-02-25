import { PF2ECharacter } from '@actor/character';
import { PF2ENPC } from '@actor/npc';
import { PF2EEffect } from '@item/effect';
import { ActionDefaultOptions } from '../..//module/system/actions/actions';
import { LocalizationPF2e } from '../../module/system/localization';

/** Effect: Raise a Shield */
const ITEM_UUID = 'Compendium.pf2e.equipment-effects.2YgXoHvJfrDHucMr';

const TEMPLATES = {
    flavor: './systems/pf2e/templates/chat/action/flavor.html',
    content: './systems/pf2e/templates/chat/action/content.html',
};

/** A macro for the Raise a Shield action */
export async function raiseAShield(options: ActionDefaultOptions): Promise<void> {
    const translations = new LocalizationPF2e().translations.PF2E.Actions.RaiseAShield;

    const actors = Array.isArray(options.actors) ? options.actors : [options.actors];
    const actor = actors[0];
    if (actors.length > 1 || !(actor instanceof PF2ECharacter || actor instanceof PF2ENPC)) {
        throw Error(`PF2e System | ${translations.BadArgs}.`);
    }

    const shield = actor.itemTypes.armor
        .filter((armor) => armor.data.data.armorType.value === 'shield')
        .find((shield) => shield.data.data.equipped.value === true);
    const speaker = ChatMessage.getSpeaker({ actor: actor });

    const isSuccess = await (async (): Promise<boolean> => {
        if (shield) {
            const existingEffect = actor.itemTypes.effect.find(
                (effect) => effect.getFlag('core', 'sourceId') === ITEM_UUID,
            );
            if (existingEffect) {
                await actor.deleteOwnedItem(existingEffect._id);
                return false;
            } else {
                const effect = await fromUuid(ITEM_UUID);
                if (!(effect instanceof PF2EEffect)) {
                    throw Error('PF2e System | Raise a Shield effect not found');
                }
                effect.data.img = shield.img;
                const rule = effect.data.data.rules!.find(
                    (rule) => rule.selector === 'ac' && rule.key === 'PF2E.RuleElement.FlatModifier',
                );
                rule!.value = shield.data.data.armor.value;
                await actor.createEmbeddedEntity('OwnedItem', effect.data);
                return true;
            }
        } else {
            ui.notifications.warn(game.i18n.format(translations.NoShieldEquipped, { actor: speaker.alias }));
            return false;
        }
    })();

    if (isSuccess) {
        const title = translations.Title;
        const content = await renderTemplate(TEMPLATES.content, {
            imgPath: shield!.img,
            message: game.i18n.format(translations.Content, { actor: speaker.alias }),
        });
        const flavor = await renderTemplate(TEMPLATES.flavor, {
            action: { title, typeNumber: 1 },
        });

        await ChatMessage.create({
            type: CONST.CHAT_MESSAGE_TYPES.EMOTE,
            speaker,
            flavor,
            content,
        });
    }
}
