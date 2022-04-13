import { ActorPF2e } from "@actor";
import { ActorType } from "@actor/data";

/**
 * Collects every actor whose token is controlled on the canvas, and if none are, collects the current user's character, if it exists.
 *
 * @param types The actor types the function should take into consideration. Defaults to "character" and "npc".
 * @param useOwnCharacter If true, the function will append the user's own character to the list of collected actors.
 * @returns An array of ActorPF2E elements according to the aforementioned filters.
 */
async function getSelectedOrOwnActors(
    types: ActorType[] = ["character", "npc"],
    useOwnCharacter = true
): Promise<ActorPF2e[]> {
    const actors = canvas.tokens.controlled
        .flatMap((token) => (token.actor ? token.actor : []))
        .filter((owned) => owned.isOwner)
        .filter((actor) => actor.isOfType(...types));

    if (actors.length === 0 && game.user.character && useOwnCharacter) actors.push(game.user.character);

    return actors;
}

export { getSelectedOrOwnActors };
