import type { DocumentFlags } from "@common/data/_module.d.mts";
import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import type { TokenSchema } from "@common/documents/token.d.mts";

type TokenFlagsPF2e = DocumentFlags & {
    [SYSTEM_ID]: {
        linkToActorSize: boolean;
        autoscale: boolean;
    };
};

type DetectionModeEntry = ModelPropsFromSchema<TokenSchema>["detectionModes"][number];

export type { DetectionModeEntry, TokenFlagsPF2e };
