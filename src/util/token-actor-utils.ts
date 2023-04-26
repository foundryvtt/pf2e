import { ActorPF2e } from "@actor";
import { ActorType } from "@actor/data/index.ts";

/**
 * Collects every actor whose token is controlled on the canvas, and if none are, collects the current user's character, if it exists.
 *
 * @param types The actor types the function should take into consideration.
 * @param useOwnCharacter If true, the function will append the user's own character to the list of collected actors.
 * @returns An array of ActorPF2E elements according to the aforementioned filters.
 */
function getSelectedOrOwnActors(types?: ActorType[], useOwnCharacter = true): ActorPF2e[] {
    const actors = canvas.tokens.controlled
        .flatMap((token) => (token.actor ? token.actor : []))
        .filter((actor) => actor.isOwner)
        .filter((actor) => !types || actor.isOfType(...types));

    if (actors.length === 0 && game.user.character && useOwnCharacter) actors.push(game.user.character);

    return actors;
}

export { getSelectedOrOwnActors };
