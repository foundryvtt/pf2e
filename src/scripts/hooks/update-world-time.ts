export const UpdateWorldTime = {
    listen: (): void => {
        Hooks.on("updateWorldTime", async (_total, diff) => {
            // Handle effect-tracking by encounter turns when an encounter is active
            if (!game.combat?.started) game.pf2e.effectTracker.refresh({ resetItemData: true });

            const worldClock = game.pf2e.worldClock;
            window.setTimeout(() => worldClock.render(), 1000);
            await worldClock.syncDarkness(canvas.scene, { timeDiff: diff });
        });
    },
};
