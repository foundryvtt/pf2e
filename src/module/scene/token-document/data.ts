interface TokenFlagsPF2e extends DocumentFlags {
    pf2e: {
        [key: string]: unknown;
        linkToActorSize: boolean;
        autoscale: boolean;
    };
    [key: string]: Record<string, unknown>;
}

export { TokenFlagsPF2e };
