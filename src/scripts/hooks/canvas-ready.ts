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

            // Check area effects after the first canvas-ready call
            Hooks.on("canvasReady", async () => {
                const withAuraEffects = game.pf2e.effectTracker.auraEffects
                    .filter(
                        (e) =>
                            e.actor.isOwner &&
                            e.actor.getActiveTokens(false, true).some((t) => t.scene === canvas.scene)
                    )
                    .map((e) => e.actor);
                for (const actor of new Set(withAuraEffects)) {
                    actor.checkAreaEffects();
                }
            });
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
            });
        });
    },
};
