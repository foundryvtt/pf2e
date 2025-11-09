import { toggleClearTemplatesButton } from "@module/chat-message/helpers.ts";

export const CanvasReady = {
    listen: (): void => {
        Hooks.once("canvasReady", () => {
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
            game.pf2e.effectPanel.render({ force: true });
            if (!canvas.scene) return;

            if (game.ready) canvas.scene.reset();
            // Accomodate hex grid play with a usable default cone angle
            CONFIG.MeasuredTemplate.defaults.angle = canvas.grid.isHexagonal ? 60 : 90;

            for (const token of canvas.tokens.placeables) {
                // Redraw effects on visible tokens
                if (token.visible) token.renderFlags.set({ redrawEffects: true });
            }

            // Show clear-measured-templates buttons
            for (const message of game.messages.contents.slice((-1 * CONFIG.ChatMessage.batchSize) / 2)) {
                toggleClearTemplatesButton(message);
            }
        });
    },
};
