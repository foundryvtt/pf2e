import { ActorPF2e } from "@actor";

/**
 * Collects every actor whose token is controlled on the canvas, and if none are, collects the current user's character, if it exists.
 *
 * If no actors could be collected at all, displays a notification urging the user to select at least one token.
 *
 * @returns An array of ActorPF2E elements according to the aforementioned filters.
 */
async function getSelectedOrOwnActors(): Promise<ActorPF2e[]> {
    const actors = canvas.tokens.controlled
        .flatMap((token) => (token.actor ? token.actor : []))
        .filter((owned) => owned.isOwner)
        .filter((hasInventory) => hasInventory.isOfType("character", "npc"));

    if (actors.length === 0 && game.user.character) actors.push(game.user.character);
    if (actors.length === 0) {
        ui.notifications.error(game.i18n.format("PF2E.ErrorMessage.NoTokenSelected"));
    }

    return actors;
}

export { getSelectedOrOwnActors };
