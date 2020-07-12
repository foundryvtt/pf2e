(async () => {
    if (actor) {
        for ( let token of canvas.tokens.controlled ) {
            let messageContent = '';
                if ((token.actor.data.data.customModifiers['attack'] || []).some(modifier => modifier.name === 'Inspire Courage')) {
                    await token.actor.removeCustomModifier('attack', 'Inspire Courage');
                    await token.actor.removeCustomModifier('damage', 'Inspire Courage');

                    if (token.data.effects.includes("systems/pf2e/icons/conditions-2/status_hero.png")) {
                        await token.toggleEffect("systems/pf2e/icons/conditions-2/status_hero.png")
                    }

                    messageContent = 'Is no longer Inspired.'
                } else {
                    await token.actor.addCustomModifier('attack', 'Inspire Courage', 1, 'status');
                    await token.actor.addCustomModifier('damage', 'Inspire Courage', 1, 'status');

                    if (!token.data.effects.includes("systems/pf2e/icons/conditions-2/status_hero.png")) {
                        await token.toggleEffect("systems/pf2e/icons/conditions-2/status_hero.png")
                    }

                    messageContent = 'Is Inspired!'
                };
                // create the message 

                if (messageContent !== '') {
                    let chatData = {
                        user: game.user._id,
                        speaker: ChatMessage.getSpeaker(),
                        content: messageContent,
                    };

                    await ChatMessage.create(chatData, {});
                }
        }
    } else {
        ui.notifications.warn("You must have an actor selected.");
    }
})();
