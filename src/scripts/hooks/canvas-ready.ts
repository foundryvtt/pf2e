import { ConditionManager } from '@module/conditions';
import { StatusEffects } from '@scripts/actor/status-effects';

/**
 * This runs after game data has been requested and loaded from the servers, so entities exist
 */
export function listen() {
    Hooks.once('canvasReady', async () => {
        // Requires ConditionManager to be fully loaded.
        await ConditionManager.init();
        StatusEffects.init();
    });
    Hooks.on('canvasReady', () => {
        // Effect Panel singleton application
        if ((game.user.getFlag('pf2e', 'settings.showEffectPanel') ?? true) && game?.pf2e) {
            game.pf2e.effectPanel.render(true);
        }
    });
}
