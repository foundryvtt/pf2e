import type { DocumentFlags } from "@common/data/_module.d.mts";
import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import type { TokenSchema } from "@common/documents/token.d.mts";

type TokenFlagsPF2e = DocumentFlags & {
    [SYSTEM_ID]: {
        linkToActorSize: boolean;
        autoscale: boolean;
        /** Root token data, used for troops and in the future eidolons */
        troop?: TroopFlags;
    };
};

interface TroopFlags {
    id: string;
    /**
     * If this troop was from a linked actor.
     * Troop tokens are always unlinked, but may need to update a world actor's HP
     */
    linked: boolean;
}

type DetectionModeEntry = ModelPropsFromSchema<TokenSchema>["detectionModes"][number];

export type { DetectionModeEntry, TokenFlagsPF2e };
