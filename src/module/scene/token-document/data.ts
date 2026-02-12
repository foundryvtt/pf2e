import type { DocumentFlags } from "@common/data/_module.d.mts";
import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import type { TokenSchema } from "@common/documents/token.d.mts";

type TokenFlagsPF2e = DocumentFlags & {
    [SYSTEM_ID]: {
        /** If true, this token is the primary token of a troop */
        hasChildTokens?: boolean;
        /** The parent token of a troop segment which certain operations should defer to */
        parentTokenId?: string;
        linkToActorSize: boolean;
        autoscale: boolean;
    };
};

type DetectionModeEntry = ModelPropsFromSchema<TokenSchema>["detectionModes"][number];

export type { DetectionModeEntry, TokenFlagsPF2e };
