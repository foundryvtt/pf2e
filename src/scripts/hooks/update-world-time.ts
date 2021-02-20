export function listen() {
    Hooks.on('updateWorldTime', async (_total, _diff) => {
        game.pf2e.effectPanel!.refresh();

        // Add micro-delay due to the Calendar/Weather module waiting until the JQuery $(document).ready event fires
        // to set its hook.
        setTimeout(() => game.pf2e.worldClock!.render(false), 1);
    });
}
