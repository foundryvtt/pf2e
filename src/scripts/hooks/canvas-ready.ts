/**
 * This runs after game data has been requested and loaded from the servers, so entities exist
 */
export function listen() {
    Hooks.once('canvasReady', async () => {
        // Requires ConditionManager to be fully loaded.
        await game.pf2e.ConditionManager.init();
        game.pf2e.StatusEffects.init();
    });
    Hooks.on('canvasReady', () => {
        // Effect Panel singleton application
        if (game.user.getFlag('pf2e', 'settings.showEffectPanel') ?? true) {
            game.pf2e.effectPanel.render(true);
        }

        // Apply token documents' derived data to their placeable token objects
        if (canvas.scene) {
            for (const tokenDoc of canvas.scene.tokens) {
                tokenDoc.prepareData({ fromActor: true });
            }
        }
    });
}
