import { SceneDarknessAdjuster } from "@module/apps/scene-darkness-adjuster";

export const LightingRefresh = {
    listen: () => {
        Hooks.on("lightingRefresh", () => {
            if (canvas.effects.noRefreshHooks) return;

            // If the scene darkness adjuster is currently being viewed, show the updated darkness
            SceneDarknessAdjuster.instance.onLightingRefresh(canvas.darknessLevel);
        });
    },
};
