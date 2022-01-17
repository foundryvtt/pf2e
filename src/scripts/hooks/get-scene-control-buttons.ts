import { SceneDarknessAdjuster } from "@module/apps/scene-darkness-adjuster";

/** Insert system tool buttons to the control bar */
export const GetSceneControlButtons = {
    listen: (): void => {
        Hooks.on("getSceneControlButtons", (controls) => {
            const tokenTools = controls.find((c) => c.name === "token")?.tools;
            tokenTools?.push({
                name: "worldclock",
                title: "CONTROLS.WorldClock",
                icon: "fas fa-clock",
                button: true,
                visible:
                    game.settings.get("pf2e", "worldClock.showClockButton") &&
                    (game.user.isGM || game.settings.get("pf2e", "worldClock.playersCanView")),
                onClick: () => {
                    if (game.pf2e.worldClock.rendered) {
                        game.pf2e.worldClock.close({ force: true });
                    } else {
                        game.pf2e.worldClock.render(true);
                    }
                },
            });

            const lightingTools = controls.find((c) => c.name === "lighting")?.tools;
            const dayTool = lightingTools?.find((tool) => tool.name === "day");
            if (!(lightingTools && dayTool)) return;

            lightingTools.splice(lightingTools?.indexOf(dayTool), 0, {
                name: "darkness-adjuster",
                title: "CONTROLS.AdjustSceneDarkness",
                icon: "fas fa-adjust",
                visible: game.user.isGM && game.settings.get("pf2e", "automation.rulesBasedVision"),
                toggle: true,
                onClick: () => {
                    const adjuster = SceneDarknessAdjuster.instance;
                    if (adjuster.rendered) {
                        $("#darkness-adjuster").fadeOut(() => {
                            adjuster.close({ force: true });
                        });
                    } else {
                        adjuster.render(true, { scene: canvas.scene }).then(() => {
                            $("#darkness-adjuster").hide().fadeIn();
                        });
                    }
                },
            });
        });
    },
};
