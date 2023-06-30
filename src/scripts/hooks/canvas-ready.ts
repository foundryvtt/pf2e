/** This runs after game data has been requested and loaded from the servers, so entities exist */
export const CanvasReady = {
    listen: (): void => {
        Hooks.once("canvasReady", async () => {
            await game.pf2e.ConditionManager.initialize();

            // Register aura effects on synthetic actors after scene and canvas are ready
            const tokenActors = canvas.scene?.tokens.contents.flatMap((t) => t.actor ?? []) ?? [];
            for (const actor of tokenActors) {
                for (const effect of actor.itemTypes.effect.filter((e) => e.fromAura)) {
                    game.pf2e.effectTracker.register(effect);
                }
            }
        });

        Hooks.on("canvasReady", () => {
            // Effect Panel singleton application
            game.pf2e.effectPanel.render(true);

            if (canvas.scene) {
                if (game.ready) canvas.scene.reset();
                // Accomodate hex grid play with a usable default cone angle
                CONFIG.MeasuredTemplate.defaults.angle = canvas.scene.hasHexGrid ? 60 : 90;

                for (const token of canvas.tokens.placeables.filter((t) => t.visible)) {
                    token.renderFlags.set({ redrawEffects: true });
                }
            }
        });
    },
};
