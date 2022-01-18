import { SceneDarknessAdjuster } from "@module/apps/scene-darkness-adjuster";

export const RenderSceneControls = {
    listen: (): void => {
        Hooks.on("renderSceneControls", (controls) => {
            const adjuster = SceneDarknessAdjuster.instance;
            if (controls.activeControl !== "lighting" && adjuster.rendered) {
                // Close it when the user clicks a different control or tool button
                $("#darkness-adjuster").fadeOut(() => {
                    adjuster.close({ force: true });
                });
            }
        });
    },
};
