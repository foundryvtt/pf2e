import { SetAsInitiative } from "@module/chat-message/listeners/set-as-initiative";

/** This runs after game data has been requested and loaded from the servers, so entities exist */
export const CanvasReady = {
    listen: (): void => {
        Hooks.once("canvasReady", async () => {
            // Requires ConditionManager to be fully loaded.
            await game.pf2e.ConditionManager.initialize();
            game.pf2e.StatusEffects.init();
            for (const li of $("#chat-log").children("li")) {
                SetAsInitiative.listen($(li));
            }

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
            if (game.user.settings.showEffectPanel) {
                game.pf2e.effectPanel.render(true);
            }

            if (game.ready) game.scenes.active?.reset();

            Promise.resolve().then(async () => {
                // Redraw tokens
                for (const token of canvas.tokens.placeables) {
                    const { visible } = token;
                    await token.draw();
                    token.visible = visible;
                }
            });
        });
    },
};
