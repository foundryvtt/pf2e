import type { ActorPF2e, ActorType } from "@actor";
import { ACTOR_TYPES } from "@actor/values.ts";
import * as R from "remeda";

const actorTypes: (ActorType | "creature")[] = [...ACTOR_TYPES];

/**
 * Collects every actor whose token is controlled on the canvas.
 * @param [options] Filter and fallback options
 * @returns An array of ActorPF2E instances filtered by the requested types.
 */
function getSelectedActors(options: GetSelectedActorsOptions = {}): ActorPF2e[] {
    const { include = actorTypes, exclude = [], assignedFallback = false } = options;
    const actors = R.uniq(
        game.user
            .getActiveTokens()
            .flatMap((t) =>
                t.actor &&
                (include.length === 0 || t.actor.isOfType(...include)) &&
                (exclude.length === 0 || !t.actor.isOfType(...exclude))
                    ? t.actor
                    : [],
            ),
    );
    const assigned = game.user.character;
    if (actors.length > 0 || !assignedFallback || !assigned) {
        return actors;
    }

    if (
        (include.length === 0 || assigned.isOfType(...include)) &&
        (exclude.length === 0 || !assigned.isOfType(...exclude))
    ) {
        return [assigned];
    }

    return [];
}

interface GetSelectedActorsOptions {
    /** Actor types that should be included (defaults to all) */
    include?: (ActorType | "creature")[];
    /** Actor types that should be excluded (defaults to none) */
    exclude?: (ActorType | "creature")[];
    /** Given no qualifying actor is selected, fall back to the user's assigned character if it also qualifies. */
    assignedFallback?: boolean;
}

export { getSelectedActors };
