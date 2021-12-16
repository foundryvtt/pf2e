import { SetAsInitiative } from "@module/chat-message/listeners/set-as-initiative";

/** This runs after game data has been requested and loaded from the servers, so entities exist */
export const CanvasReady = {
    listen: (): void => {
        Hooks.once("canvasReady", async () => {
            // Requires ConditionManager to be fully loaded.
            await game.pf2e.ConditionManager.init();
            game.pf2e.StatusEffects.init();
            for (const li of $("#chat-log").children("li")) {
                SetAsInitiative.listen($(li));
            }
        });

        Hooks.on("canvasReady", () => {
            // Effect Panel singleton application
            if (game.user.getFlag("pf2e", "settings.showEffectPanel") ?? true) {
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
