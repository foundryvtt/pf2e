export const UpdateWorldTime = {
    listen: (): void => {
        Hooks.on("updateWorldTime", async (_total, diff) => {
            /** Handle effect-tracking by encounter turns when an encounter is active */
            if (!game.combat?.started) game.pf2e.effectTracker.refresh({ resetItemData: true });

            // Add micro-delay due to the Calendar/Weather module waiting until the JQuery $(document).ready event fires
            // to set its hook.
            const worldClock = game.pf2e.worldClock;
            setTimeout(() => worldClock.render(false), 1);

            await worldClock.animateDarkness(diff);
        });
    },
};
