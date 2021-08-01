export const CanvasReady = {
    listen: (): void => {
        Hooks.once('canvasReady', async () => {
            game.pf2e.ConditionManager.localize();
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
            }
        });
    },
};
