import type { DocumentFlags } from "@common/data/_types.d.mts";
import { ZeroToTwo } from "@module/data.ts";

type SceneFlagsPF2e = DocumentFlags & {
    [SYSTEM_ID]: {
        [key: string]: unknown;
        hearingRange: number | null;
        /** Rules-based vision override for the scene: `null` indicates the world setting is used. */
        rulesBasedVision: boolean | null;
        syncDarkness: "enabled" | "disabled" | "default";
        /** The global terrain types for this scene */
        environmentTypes?: EnvironmentType[];
    };
};

enum LightLevels {
    DARKNESS = 1 / 4,
    BRIGHT_LIGHT = 3 / 4,
}

type LightLevel = ZeroToTwo;
type EnvironmentType = keyof typeof CONFIG.PF2E.environmentTypes;

export { LightLevels };
export type { EnvironmentType, LightLevel, SceneFlagsPF2e };
