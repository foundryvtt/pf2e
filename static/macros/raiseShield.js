// 'Raise Shield' macro that will raised a shield the character has equipped
let messageContent = ''
if (!actor) {
    ui.notifications.warn("You must have an actor selected.");
}

(async () => {
    for (let token of canvas.tokens.controlled) {
        const shield = token.actor.data.items.filter(item => item.type === 'armor')
            .filter(armor => armor.data.armorType.value === 'shield')
            .find(shield => shield.data.equipped.value);
        if (shield) {
            if (token.data.effects.includes("systems/pf2e/icons/conditions-2/status_acup.png")) {
                actor.removeCustomModifier('ac', 'Raised Shield')
                token.toggleEffect("systems/pf2e/icons/conditions-2/status_acup.png")
                messageContent = 'Lowers their shield'
            } else {
                actor.addCustomModifier('ac', 'Raised Shield', Number(shield.data.armor.value), 'circumstance');
                token.toggleEffect("systems/pf2e/icons/conditions-2/status_acup.png")
                messageContent = 'Raises their shield'
            };


        } else ui.notifications.warn("You must have a shield equipped.");
    }
})();
// create the message
if (messageContent !== '') {
    let chatData = {
        user: game.user._id,
        speaker: ChatMessage.getSpeaker(),
        content: messageContent,
    };
    ChatMessage.create(chatData, {});
}
