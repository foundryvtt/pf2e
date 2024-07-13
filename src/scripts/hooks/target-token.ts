import type { TokenDocumentPF2e } from "@scene";
import { getSelectedActors } from "@util/token-actor-utils.ts";

export const TargetToken = {
    listen: (): void => {
        Hooks.on("targetToken", (user, token, targeted): void => {
            const tokenDocument = token.document as TokenDocumentPF2e;
            ui.combat.refreshTargetDisplay(tokenDocument);

            // Draw flanking highlights if applicable
            const actors = getSelectedActors({ include: ["creature"] });
            if (actors.length === 1 && tokenDocument.object) {
                const actor = actors[0];
                const actorToken = actor.getActiveTokens(false, false).shift();
                if (canvas.tokens.highlightObjects && user === game.user) {
                    actorToken?.flankingHighlight.draw();
                }
            }

            // Flash the token ring for all users
            if (targeted) {
                token.ring?.flashColor(user.color, {
                    duration: 1000,
                    easing: (pt: number) => {
                        return (Math.sin(2 * Math.PI * pt - Math.PI / 2) + 1) / 2;
                    },
                });
            }
        });
    },
};
