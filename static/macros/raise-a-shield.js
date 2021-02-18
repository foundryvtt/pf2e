// 'Raise Shield' macro that will raised a shield the character has equipped
let messageContent = '';
if (!actor) {
    ui.notifications.warn('You must have an actor selected.');
}

const ITEM_UUID = 'Compendium.pf2e.equipment-effects.2YgXoHvJfrDHucMr'; // Effect: Raise a Shield
(async () => {
    const effect = duplicate(await fromUuid(ITEM_UUID));
    effect.flags.core = effect.flags.core ?? {};
    effect.flags.core.sourceId = effect.flags.core.sourceId ?? ITEM_UUID;
    for (let token of canvas.tokens.controlled) {
        const shield = token.actor.data.items
            .filter((item) => item.type === 'armor')
            .filter((armor) => armor.data.armorType.value === 'shield')
            .find((shield) => shield.data.equipped.value);
        if (shield) {
            let existing = token.actor.items.find(
                (i) => i.type === 'effect' && i.data.flags.core?.sourceId === ITEM_UUID,
            );
            if (existing) {
                token.actor.deleteOwnedItem(existing._id);
                messageContent = 'Lowers their shield';
            } else {
                effect.img = shield.img;
                effect.data.rules.find(
                    (r) => r.selector === 'ac' && r.key === 'PF2E.RuleElement.FlatModifier',
                )?.value = shield.data.armor.value;
                token.actor.createOwnedItem(effect);
                messageContent = 'Raises their shield';
            }
        } else ui.notifications.warn('You must have a shield equipped.');
    }
})();
// create the message
if (messageContent !== '') {
    let chatData = {
        content: messageContent,
    };
    ChatMessage.create(chatData, {});
}
