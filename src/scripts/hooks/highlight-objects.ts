import { getSelectedOrOwnActors } from "@util/token-actor-utils.ts";

export const HighlightObjects = {
    listen: (): void => {
        Hooks.on("highlightObjects", (active): void => {
            const actors = getSelectedOrOwnActors();
            if (actors.length === 1) {
                const actor = actors[0];
                const actorToken = actor.getActiveTokens(false, true).shift();

                // draw or clear potential token flanking highlight
                // whether token is actually flanking gets checked elsewhere
                active ? actorToken?.object?.flankingHighlight.draw() : actorToken?.object?.flankingHighlight.clear();
            }
        });
    },
};
