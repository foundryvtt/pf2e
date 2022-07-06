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
        });

        Hooks.on("canvasReady", () => {
            // Effect Panel singleton application
            if (game.user.settings.showEffectPanel) {
                game.pf2e.effectPanel.render(true);
            }

            Promise.resolve().then(async () => {
                // Redraw tokens
                for (const token of canvas.tokens.placeables) {
                    const { visible } = token;
                    await token.draw();
                    token.visible = visible;
                }

                // Recheck auras and aura effects when an active scene is (re)drawn
                if (canvas.scene?.active) {
                    for (const effect of game.pf2e.effectTracker.auraEffects) {
                        await effect.actor.checkAreaEffects();
                    }
                }
            });
        });
    },
};
