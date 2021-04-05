import { CharacterPF2e } from '@actor/character';
import { NPCPF2e } from '@actor/npc';
import { EffectPF2e } from '@item/effect';
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
        throw Error(`PF2e System | ${translations.BadArgs}.`);
    }

    const speaker = ChatMessage.getSpeaker({ actor: actor });
    const npcShield = {
        name: LocalizePF2e.translations.PF2E.ArmorTypeShield,
        acBonus: actor.attributes.shield.ac,
        isBroken: actor.attributes.shield.value <= actor.attributes.shield.brokenThreshold,
        img: 'systems/pf2e/icons/actions/raise-a-shield.webp',
    };
    const shield = actor.heldShield ?? (actor instanceof NPCPF2e && npcShield.acBonus > 0 ? npcShield : null);

    const isSuccess = await (async (): Promise<boolean> => {
        if (shield && !shield.isBroken) {
            const existingEffect = actor.itemTypes.effect.find(
                (effect) => effect.getFlag('core', 'sourceId') === ITEM_UUID,
            );
            if (existingEffect) {
                await actor.deleteOwnedItem(existingEffect._id);
                return false;
            } else {
                const effect = await fromUuid(ITEM_UUID);
                if (!(effect instanceof EffectPF2e)) {
                    throw ErrorPF2e('Raise a Shield effect not found');
                }
                effect.data.img = shield.img;
                const rule = effect.data.data.rules!.find(
                    (rule) => rule.selector === 'ac' && rule.key === 'PF2E.RuleElement.FlatModifier',
                );
                rule!.value = shield.acBonus;
                await actor.createEmbeddedEntity('OwnedItem', effect.data);
                return true;
            }
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
