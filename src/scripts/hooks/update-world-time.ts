import { resetAndRerenderActors } from "@actor/helpers";

export const UpdateWorldTime = {
    listen: (): void => {
        Hooks.on("updateWorldTime", async (_total, diff) => {
            /** Handle effect-tracking by encounter turns when an encounter is active */
            if (!game.combat?.started) {
                const actors = new Set(game.pf2e.effectTracker.effects.map((e) => e.actor));
                await resetAndRerenderActors(actors);
            }

            // Add micro-delay due to the Calendar/Weather module waiting until the JQuery $(document).ready event fires
            // to set its hook.
            const worldClock = game.pf2e.worldClock;
            setTimeout(() => worldClock.render(false), 1);

            await worldClock.animateDarkness(diff);
        });
    },
};
