import { CritFumbleCardsPF2e } from '@scripts/chat/crit-fumble-cards';

export function listen() {
    Hooks.once('renderChatLog', async () => {
        if (game.settings.get('pf2e', 'drawCritFumble') || game.settings.get('pf2e', 'critFumbleButtons')) {
            CritFumbleCardsPF2e.init();
        }
    });
}
