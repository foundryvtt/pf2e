/* global game */

class PF2eCritFumbleCards {
    static critTable: any;
    static fumbleTable: any;
    static diceSoNice: boolean;

    static async init() {
        const rollableTables = game.packs.get('pf2e.rollable-tables');
        this.critTable = new RollTable(await rollableTables.getEntry('FTEpsIWWVrDj0jNG'));
        this.fumbleTable = new RollTable(await rollableTables.getEntry('WzMGWMIrrPvSp75D'));

        if (game.settings.get('pf2e', 'drawCritFumble')) {
            // Support diceSoNice module
            this.diceSoNice = game.modules.get('dice-so-nice') && game.modules.get('dice-so-nice').active;
            const hooksOn = this.diceSoNice ? 'diceSoNiceRollComplete' : 'createChatMessage';

            Hooks.on(hooksOn, this.handleRoll.bind(this));
        }

        if (game.settings.get('pf2e', 'critFumbleButtons')) {
            Hooks.on('renderChatMessage', (message: ChatMessage, html: any) => {
                if (message.isAuthor && message.isRoll && (message as any).isContentVisible) {
                    const context = message.getFlag('pf2e', 'context');
                    if (message.roll.dice[0]?.faces === 20 && context?.type === 'attack-roll') {
                        const critButton = $(
                            `<button class="dice-total-fullDamage-btn" style="width: 22px; height:22px; font-size:10px;line-height:1px"><i class="fas fa-thumbs-up" title="${game.i18n.localize(
                                'PF2E.CriticalHitCardButtonTitle',
                            )}"></i></button>`,
                        );
                        const fumbleButton = $(
                            `<button class="dice-total-fullDamage-btn" style="width: 22px; height:22px; font-size:10px;line-height:1px"><i class="fas fa-thumbs-down" title="${game.i18n.localize(
                                'PF2E.CriticalFumbleCardButtonTitle',
                            )}"></i></button>`,
                        );
                        const btnContainer1 = $(
                            `<span class="dmgBtn-container" style="position:absolute; right:0; bottom:1px;"></span>`,
                        );
                        btnContainer1.append(critButton);
                        btnContainer1.append(fumbleButton);

                        critButton.on('click', (event) => {
                            event.stopPropagation();
                            this.critTable.draw();
                            event.currentTarget.blur();
                        });

                        fumbleButton.on('click', (event) => {
                            event.stopPropagation();
                            this.fumbleTable.draw();
                            event.currentTarget.blur();
                        });

                        html.find('.dice-total').wrapInner('<span id="value"></span>').append(btnContainer1);
                    }
                }
            });
        }
    }

    static handleRoll(chatMessage: any) {
        // diceSoNiceRollComplete has a chat message id instead of the original chat message
        chatMessage = this.diceSoNice ? game.messages.get(chatMessage) : chatMessage;
        if (chatMessage.isAuthor && chatMessage.isRoll && chatMessage.isContentVisible) {
            const context = chatMessage.getFlag('pf2e', 'context');
            if (context?.type === 'attack-roll') {
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

Hooks.once('renderChatLog', async () => {
    game.settings.register('pf2e', 'critFumbleButtons', {
        name: game.i18n.localize('PF2E.SETTINGS.critFumbleCardButtons.name'),
        hint: game.i18n.localize('PF2E.SETTINGS.critFumbleCardButtons.hint'),
        scope: 'world',
        config: true,
        default: false,
        type: Boolean,
        onChange: () => {
            window.location.reload();
        },
    });

    game.settings.register('pf2e', 'drawCritFumble', {
        name: game.i18n.localize('PF2E.SETTINGS.critFumbleCards.name'),
        hint: game.i18n.localize('PF2E.SETTINGS.critFumbleCards.hint'),
        scope: 'world',
        config: true,
        default: false,
        type: Boolean,
        onChange: () => {
            window.location.reload();
        },
    });

    if (game.settings.get('pf2e', 'drawCritFumble') || game.settings.get('pf2e', 'critFumbleButtons')) {
        await PF2eCritFumbleCards.init();
    }
});
