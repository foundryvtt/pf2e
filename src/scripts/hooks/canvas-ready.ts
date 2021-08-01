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

        // Redraw tokens
        if (canvas.scene) {
            const tokens = canvas.scene.tokens.map((tokenDoc) => tokenDoc.object);
            for (const token of tokens) {
                token.redraw();
            }
            canvas.darkvision.draw();
        }
    });
}
