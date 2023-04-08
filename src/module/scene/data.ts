import { ZeroToTwo } from "@module/data.ts";

interface SceneFlagsPF2e extends DocumentFlags {
    pf2e: {
        [key: string]: unknown;
        syncDarkness: "enabled" | "disabled" | "default";
    };
}

enum LightLevels {
    DARKNESS = 1 / 4,
    BRIGHT_LIGHT = 3 / 4,
}

type LightLevel = ZeroToTwo;

export { LightLevel, LightLevels, SceneFlagsPF2e };
