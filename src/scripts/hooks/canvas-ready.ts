import { TokenRulerPF2e } from "@module/canvas/token/ruler.ts";
import { toggleClearTemplatesButton } from "@module/chat-message/helpers.ts";

/** This runs after game data has been requested and loaded from the servers, so entities exist */
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

            const hasSceneTerrains = !!canvas.scene.flags.pf2e.environmentTypes?.length;
            for (const token of canvas.tokens.placeables) {
                // Reset actors to add scene and region terrains and refresh their available roll options
                // The first reset is performed in the ready hook
                if (game.ready) {
                    if (
                        hasSceneTerrains ||
                        (token.document.regions ?? []).some((r) =>
                            r.behaviors.some((b) => !b.disabled && b.type === "environment"),
                        )
                    ) {
                        token.actor?.reset();
                    }
                }
                // Redraw effects on visible tokens
                if (token.visible) {
                    token.renderFlags.set({ redrawEffects: true });
                }
            }

            // Show clear-measured-templates buttons
            for (const message of game.messages.contents.slice((-1 * CONFIG.ChatMessage.batchSize) / 2)) {
                toggleClearTemplatesButton(message);
            }

            TokenRulerPF2e.observeHudContainer();
        });
    },
};
