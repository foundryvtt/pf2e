import { ActorPF2e } from '@module/actor/base';

/** Highlight critical success or failure on d20 rolls */
export function listen(message: ChatMessage<ActorPF2e>, html: JQuery): void {
    if (!message.isRoll || message.getFlag(game.system.id, 'damageRoll')) return;
    const dice: any = message.roll.dice[0] ?? {};
    if (dice.faces !== 20) return;

    if (message.roll.dice.length && (message as any).isContentVisible) {
        if (dice.total === 20) html.find('.dice-total').addClass('success');
        else if (dice.total === 1) html.find('.dice-total').addClass('failure');

        const context = message.getFlag('pf2e', 'context');
        if (
            (message.isAuthor || game.user.isGM) &&
            (context?.type === 'skill-check' || context?.type === 'perception-check')
        ) {
            const btnStyling = 'width: 22px; height:22px; font-size:10px;line-height:1px';
            const initiativeButtonTitle = game.i18n.localize('PF2E.ClickToSetInitiative');
            const setInitiativeButton = $(
                `<button class="dice-total-setInitiative-btn" style="${btnStyling}"><i class="fas fa-fist-raised" title="${initiativeButtonTitle}"></i></button>`,
            );
            const btnContainer = $(
                '<span class="dmgBtn-container" style="position:absolute; right:0; bottom:1px;"></span>',
            );
            btnContainer.append(setInitiativeButton);

            html.find('.dice-total').append(btnContainer);

            setInitiativeButton.on('click', (ev) => {
                ev.stopPropagation();
                ActorPF2e.setCombatantInitiative(html);
            });
        }
    }
}
