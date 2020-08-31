/* global RollTable */

class PF2eCritFumbleCards {
    static critTable: any;
    static fumbleTable: any;
    static diceSoNice: boolean;

    static async init() {
        const rollableTables = game.packs.get('pf2e.rollable-tables');
        this.critTable = new RollTable(await rollableTables.getEntry('FTEpsIWWVrDj0jNG'));
        this.fumbleTable = new RollTable(await rollableTables.getEntry('WzMGWMIrrPvSp75D'));

        // Support diceSoNice module
        this.diceSoNice = (game.modules.get('dice-so-nice') && game.modules.get('dice-so-nice').active);
        const hooksOn = this.diceSoNice ? 'diceSoNiceRollComplete' : 'createChatMessage';
        
        Hooks.on(hooksOn, this.handleRoll.bind(this));
    }

    static handleRoll(chatMessage: any) {
        // diceSoNiceRollComplete has a chat message id instead of the original chat message
        chatMessage = this.diceSoNice ? game.messages.get(chatMessage) : chatMessage;
        if (chatMessage.isAuthor && chatMessage.isRoll && chatMessage.isContentVisible) {
            if (chatMessage.data.flavor.startsWith('<b>Strike:') || chatMessage.data.flavor.includes('Attack Roll')) {
                const die = chatMessage.roll.dice[0];
                if (die.faces === 20) {
                    if (die.total === 20) {
                        this.drawCard(this.critTable, chatMessage);
                    } else if (die.total === 1) {
                        this.drawCard(this.fumbleTable, chatMessage);	
                    }
                }
            }
        }
    }

    static drawCard(table: any, chatMessage: ChatMessage) {
        // Remove roll sound of original chat message to avoid double sounds. Not needed for Dice so Nice.
        if (!this.diceSoNice) mergeObject(chatMessage.data, { '-=sound': null });
        table.draw();
    }
}

Hooks.once("ready", async () => {
    game.settings.register('pf2e', 'drawCritFumble', {
        name: game.i18n.localize("PF2E.SETTINGS.critFumbleCards.name"),
        hint: game.i18n.localize("PF2E.SETTINGS.critFumbleCards.hint"),
        scope: 'world',
        config: true,
        default: false,
        type: Boolean,
        onChange: () => {
            window.location.reload();
        }
    });

    if (game.settings.get('pf2e', 'drawCritFumble')) {
        await PF2eCritFumbleCards.init();
    }
});
