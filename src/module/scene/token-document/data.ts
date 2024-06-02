import type { TokenSchema } from "types/foundry/common/documents/token.d.ts";

type TokenFlagsPF2e = DocumentFlags & {
    pf2e: {
        [key: string]: unknown;
        linkToActorSize: boolean;
        autoscale: boolean;
    };
    [key: string]: Record<string, unknown>;
};

type DetectionModeEntry = ModelPropsFromSchema<TokenSchema>["detectionModes"][number];

export type { DetectionModeEntry, TokenFlagsPF2e };
