export function listen() {
    Hooks.on('updateWorldTime', async (_total, diff) => {
        game.pf2e.effectPanel.refresh();
        await game.pf2e.effectTracker.refresh();

        // Add micro-delay due to the Calendar/Weather module waiting until the JQuery $(document).ready event fires
        // to set its hook.
        const worldClock = game.pf2e.worldClock;
        setTimeout(() => worldClock.render(false), 1);

        await worldClock.animateDarkness(diff);
    });
}
