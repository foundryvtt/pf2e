import { ZeroToTwo } from "@module/data.ts";

interface SceneFlagsPF2e extends DocumentFlags {
    pf2e: {
        [key: string]: unknown;
        hearingRange: number | null;
        /** Rules-based vision override for the scene: `null` indicates the world setting is used. */
        rulesBasedVision: boolean | null;
        syncDarkness: "enabled" | "disabled" | "default";
    };
}

enum LightLevels {
    DARKNESS = 1 / 4,
    BRIGHT_LIGHT = 3 / 4,
}

type LightLevel = ZeroToTwo;

export { LightLevels };
export type { LightLevel, SceneFlagsPF2e };
