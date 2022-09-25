import { SceneDarknessAdjuster } from "@module/apps/scene-darkness-adjuster";

export const LightingRefresh = {
    listen: () => {
        Hooks.on("lightingRefresh", () => {
            SceneDarknessAdjuster.instance.onLightingRefresh(canvas.darknessLevel);
        });
    },
};
