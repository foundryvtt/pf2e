import { ActorPF2e } from '@actor/base';

export class CritFumbleCardsPF2e {
    static critTable: RollTable;
    static fumbleTable: RollTable;
    static diceSoNice: boolean;

    static async init() {
        const rollableTables = game.packs.get<Compendium<RollTable>>('pf2e.rollable-tables')!;
        this.critTable = (await rollableTables.getEntity('FTEpsIWWVrDj0jNG'))!;
        this.fumbleTable = (await rollableTables.getEntity('WzMGWMIrrPvSp75D'))!;
        this.diceSoNice = !!game.modules.get('dice-so-nice')?.active;

        if (game.settings.get('pf2e', 'drawCritFumble')) {
            // Support diceSoNice module
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

    static handleRoll(messageOrId: string | ChatMessage<ActorPF2e>) {
        // diceSoNiceRollComplete has a chat message id instead of the original chat message
        const chatMessage = typeof messageOrId === 'string' ? game.messages.get(messageOrId) : messageOrId;
        if (chatMessage && chatMessage.isAuthor && chatMessage.isRoll && chatMessage.isContentVisible) {
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

    static drawCard(table: RollTable, chatMessage: ChatMessage<ActorPF2e>) {
        // Remove roll sound of original chat message to avoid double sounds. Not needed for Dice so Nice.
        if (!this.diceSoNice) mergeObject(chatMessage.data, { '-=sound': null });
        table.draw();
    }
}
