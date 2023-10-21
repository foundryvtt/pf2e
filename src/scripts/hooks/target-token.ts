import type { TokenDocumentPF2e } from "@scene";
import { getSelectedOrOwnActors } from "@util/token-actor-utils.ts";

export const TargetToken = {
    listen: (): void => {
        Hooks.on("targetToken", (user, token): void => {
            const tokenDocument = token.document as TokenDocumentPF2e;
            ui.combat.refreshTargetDisplay(tokenDocument);

            // Draw flanking highlights if applicable
            const actors = getSelectedOrOwnActors();
            if (actors.length === 1 && tokenDocument.object) {
                const actor = actors[0];
                const actorToken = actor.getActiveTokens(false, false).shift();
                if (canvas.tokens.highlightObjects && user === game.user) {
                    actorToken?.flankingHighlight.draw();
                }
            }
        });
    },
};
