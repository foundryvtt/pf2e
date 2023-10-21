type TokenFlagsPF2e = DocumentFlags & {
    pf2e: {
        [key: string]: unknown;
        linkToActorSize: boolean;
        autoscale: boolean;
    };
    [key: string]: Record<string, unknown>;
};

export type { TokenFlagsPF2e };
