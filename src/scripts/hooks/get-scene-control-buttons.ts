import { SceneDarknessAdjuster } from "@module/apps/scene-darkness-adjuster";

/** Insert system tool buttons to the control bar */
export const GetSceneControlButtons = {
    listen: (): void => {
        Hooks.on("getSceneControlButtons", (controls) => {
            // World Clock
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

            const lightingControls = controls.find((c) => c.name === "lighting");
            const lightingTools = lightingControls?.tools;
            const dayTool = lightingTools?.find((tool) => tool.name === "day");
            if (!(lightingControls && lightingTools && dayTool)) return;

            // Scene Darkness Adjuster

            if (lightingControls.visible && SceneDarknessAdjuster.instance.rendered) {
                SceneDarknessAdjuster.instance.close({ force: true });
            }

            lightingTools.splice(lightingTools?.indexOf(dayTool), 0, {
                name: "darkness-adjuster",
                title: "CONTROLS.AdjustSceneDarkness",
                icon: "fas fa-adjust",
                visible: game.user.isGM && game.settings.get("pf2e", "automation.rulesBasedVision"),
                toggle: true,
                onClick: (): void => {
                    const adjuster = SceneDarknessAdjuster.instance;
                    if (adjuster.rendered) {
                        adjuster.close({ force: true });
                    } else {
                        adjuster.render(true);
                    }
                },
            });
        });
    },
};
