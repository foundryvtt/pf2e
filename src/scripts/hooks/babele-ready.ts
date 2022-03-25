/** Accommodate the Babele module's need for specific timing of the condition manager's initialization */
export const BabeleReady = {
    listen(): void {
        Hooks.once("babele.ready", () => {
            game.pf2e.ConditionManager.initialize(true);
        });
    },
};
