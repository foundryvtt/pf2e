export const PF2eStartTurn = {
    listen: (): void => {
        Hooks.on("pf2e.startTurn", async () => {
            await game.pf2e.effectTracker.refresh();
            game.pf2e.effectPanel.refresh();
        });
    },
};
