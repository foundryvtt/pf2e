import { SceneDarknessAdjuster } from "@module/apps/scene-darkness-adjuster";

export const LightingRefresh = {
    listen: () => {
        Hooks.on("lightingRefresh", () => {
            const layer = canvas.lighting;
            if (layer.noRefreshHooks) return;

            // If the scene darkness adjuster is currently being viewed, show the updated darkness
            SceneDarknessAdjuster.instance.onLightingRefresh(layer.darknessLevel);
        });
    },
};
