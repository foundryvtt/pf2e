import { SceneDarknessAdjuster } from "@module/apps/scene-darkness-adjuster.ts";

export const LightingRefresh = {
    listen: (): void => {
        Hooks.on("lightingRefresh", (): void => {
            SceneDarknessAdjuster.instance.onLightingRefresh(canvas.darknessLevel);
        });
    },
};
