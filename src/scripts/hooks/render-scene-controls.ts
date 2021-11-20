import { SceneDarknessAdjuster } from "@module/apps/scene-darkness-adjuster";

export const RenderSceneControls = {
    listen: (): void => {
        Hooks.on("renderSceneControls", (controls) => {
            const adjuster = SceneDarknessAdjuster.instance;
            if (controls.activeTool === "darkness-adjuster") {
                // Open the adjuster application when its tool button is clicked
                adjuster.render(true, { scene: canvas.scene }).then(() => {
                    $("#darkness-adjuster").hide().fadeIn();
                });
            } else if (controls.activeTool !== "darkness-adjuster" && adjuster.rendered) {
                // Close it when the user clicks a different control or tool button
                $("#darkness-adjuster").fadeOut(() => {
                    adjuster.close({ force: true });
                });
            }
        });
    },
};
