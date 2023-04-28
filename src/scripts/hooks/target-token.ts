import { TokenDocumentPF2e } from "@scene/index.ts";
import { getSelectedOrOwnActors } from "@util/token-actor-utils.ts";

export const TargetToken = {
    listen: (): void => {
        Hooks.on("targetToken", (user, token, targeted): void => {
            const tokenDocument = token.document as TokenDocumentPF2e;
            const actors = getSelectedOrOwnActors();

            if (actors.length === 1 && tokenDocument.object) {
                const actor = actors[0];
                const actorToken = actor.getActiveTokens(false, true).shift();

                if (
                    targeted &&
                    user === game.user &&
                    !!actorToken?.object?.isFlanking(
                        tokenDocument.object, 
                        { reach: actor.getReach({}), ignoreFlankable: true }
                    )
                ) {
                    tokenDocument.object.showFloatyText("Flanking Position");
                }
            }

            ui.combat.refreshTargetDisplay(tokenDocument);
        });
    },
};
