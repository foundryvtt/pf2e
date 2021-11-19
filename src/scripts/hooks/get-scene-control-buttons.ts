export const GetSceneControlButtons = {
    listen: (): void => {
        Hooks.on("getSceneControlButtons", (controls) => {
            controls
                .find((c) => c.name === "token")
                ?.tools.push({
                    name: "worldclock",
                    title: "CONTROLS.WorldClock",
                    icon: "fas fa-clock",
                    visible:
                        game.settings.get("pf2e", "worldClock.showClockButton") &&
                        (game.user.isGM || game.settings.get("pf2e", "worldClock.playersCanView")),
                    onClick: () => game.pf2e.worldClock!.render(true),
                    button: true,
                });
        });
    },
};
