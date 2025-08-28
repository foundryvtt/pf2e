import type { SceneControlTool } from "@client/applications/ui/scene-controls.d.mts";
import { SceneDarknessAdjuster } from "@module/apps/scene-darkness-adjuster.ts";
import applications = foundry.applications;

/** Insert system tool buttons to the control bar */
export const GetSceneControlButtons = {
    listen: (): void => {
        Hooks.on("getSceneControlButtons", (controls) => {
            // World Clock
            const tokenTools = controls.tokens?.tools;
            if (tokenTools) {
                const settings = game.pf2e.settings.worldClock;
                tokenTools.worldClock = {
                    name: "worldClock",
                    title: "CONTROLS.WorldClock",
                    icon: "fa-solid fa-clock",
                    order: Object.keys(tokenTools).length,
                    button: true,
                    visible: settings.showClockButton && (game.user.isGM || settings.playersCanView),
                    onChange: () => {
                        if (game.pf2e.worldClock.rendered) {
                            game.pf2e.worldClock.close();
                        } else {
                            game.pf2e.worldClock.render({ force: true });
                        }
                    },
                };
            }

            const lightingControls = controls.lighting;
            const lightingTools = lightingControls?.tools;
            const dayTool = lightingTools?.day;
            if (!(lightingControls && lightingTools && dayTool)) return;

            // Indicate GM vision is on
            lightingControls.icon =
                game.pf2e.settings.gmVision && game.user.isGM
                    ? "fa-solid fa-lightbulb-cfl-on gm-vision"
                    : "fa-solid fa-lightbulb";

            const adjusterTool: SceneControlTool = {
                name: "darknessAdjuster",
                title: "CONTROLS.AdjustSceneDarkness",
                icon: "fa-solid fa-circle-half-stroke",
                order: dayTool.order,
                visible: game.user.isGM && game.pf2e.settings.rbv,
                toggle: true,
                active: false,
                onChange: (): void => {
                    const adjuster = SceneDarknessAdjuster.instance;
                    if (adjuster.rendered) {
                        adjuster.close();
                    } else {
                        adjuster.render({ force: true });
                    }
                },
            };

            // GM Vision
            const gmVisionTool = ((): SceneControlTool => {
                const binding = game.keybindings.actions.get("pf2e.gmVision")?.editable?.[0];
                const gmVisionLabel = game.i18n.localize("PF2E.Keybinding.GMVision.Label");
                const bindingLabel = binding ? applications.sidebar.apps.ControlsConfig.humanizeBinding(binding) : "";
                const gmVisionIcon = (active = game.pf2e.settings.gmVision): string =>
                    active ? "fa-solid fa-lightbulb-cfl-on" : "fa-solid fa-lightbulb-cfl";

                return {
                    name: "gmVision",
                    title: `${gmVisionLabel} [${bindingLabel}]`,
                    icon: gmVisionIcon(),
                    order: dayTool.order + 1,
                    visible: !!binding && game.user.isGM,
                    toggle: true,
                    active: game.pf2e.settings.gmVision,
                    onChange: (): void => {
                        const newStatus = !game.pf2e.settings.gmVision;
                        game.settings.set("pf2e", "gmVision", newStatus);
                        const toggle = ui.controls.control?.tools.gmVision;
                        if (toggle) {
                            toggle.active = newStatus;
                            toggle.icon = gmVisionIcon(newStatus);
                            ui.controls.render();
                        }
                    },
                };
            })();

            const newTools = [adjusterTool, gmVisionTool ?? []].flat();
            for (const tool of Object.values(lightingTools).filter((t) => t.order >= dayTool.order)) {
                tool.order += newTools.length;
            }
            for (const tool of newTools) {
                lightingTools[tool.name] = tool;
            }
        });
    },
};
