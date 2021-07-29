import { ActorPF2e } from '@module/actor/base';
import { ChatMessagePF2e } from '@module/chat-message';

/** Highlight critical success or failure on d20 rolls */
export const DegreeOfSuccessHighlights = {
    listen: (message: ChatMessagePF2e, $html: JQuery): void => {
        if ($html.find('.pf2e-reroll-indicator').length > 0) return;
        if (!message.isRoll || message.getFlag('pf2e', 'damageRoll')) return;
        const roll = message.roll!;
        const dice = roll.dice[0] ?? {};
        if (dice.faces !== 20) return;

        if (roll.dice.length && (message as any).isContentVisible) {
            if (dice.total === 20) $html.find('.dice-total').addClass('success');
            else if (dice.total === 1) $html.find('.dice-total').addClass('failure');

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

                $html.find('.dice-total').append(btnContainer);

                setInitiativeButton.on('click', (ev) => {
                    ev.stopPropagation();
                    ActorPF2e.setCombatantInitiative($html);
                });
            }
        }
    },
};
