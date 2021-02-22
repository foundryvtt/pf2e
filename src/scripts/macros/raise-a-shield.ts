import { PF2EActor, TokenPF2e } from '@actor/actor';
import { PF2ECharacter } from '@actor/character';
import { PF2ENPC } from '@actor/npc';
import { PF2EEffect } from '@item/effect';

export async function raiseShield({
    assignedActor,
    token,
}: {
    assignedActor: PF2EActor;
    token: TokenPF2e | undefined;
}): Promise<void> {
    // 'Raise Shield' macro that will raised a shield the character has equipped
    const actor = token?.actor ?? assignedActor;
    if (canvas.tokens.controlled.length > 1 || !(actor instanceof PF2ECharacter || actor instanceof PF2ENPC)) {
        ui.notifications.warn('PF2e System | This macro must be called with exactly one character or NPC.');
        return;
    }

    const ITEM_UUID = 'Compendium.pf2e.equipment-effects.2YgXoHvJfrDHucMr'; // Effect: Raise a Shield
    const effect = (await fromUuid(ITEM_UUID)) as PF2EEffect;
    const shield = actor.itemTypes.armor
        .filter((armor) => armor.data.data.armorType.value === 'shield')
        .find((shield) => shield.data.data.equipped.value === true);

    const speaker = ChatMessage.getSpeaker({ actor: actor });
    const messageContent = await (async (): Promise<string | null> => {
        if (shield) {
            const existingEffect = actor.itemTypes.effect.find(
                (effect) => effect.getFlag('core', 'sourceId') === ITEM_UUID,
            );
            if (existingEffect) {
                await actor.deleteOwnedItem(existingEffect._id);
                return `${speaker.alias} lowers their shield.`;
            } else {
                effect.data.img = shield.img;
                const rule = effect.data.data.rules?.find(
                    (rule) => rule.selector === 'ac' && rule.key === 'PF2E.RuleElement.FlatModifier',
                );
                if (rule) {
                    rule.value = shield.data.data.armor.value;
                }
                await actor.createEmbeddedEntity('OwnedItem', effect.data);
                return `${speaker.alias} raises their shield.`;
            }
        } else {
            ui.notifications.warn('You must have a shield equipped.');
            return null;
        }
    })();

    if (messageContent) {
        await ChatMessage.create(
            {
                type: CONST.CHAT_MESSAGE_TYPES.EMOTE,
                content: messageContent,
                speaker,
            },
            {},
        );
    }
}
