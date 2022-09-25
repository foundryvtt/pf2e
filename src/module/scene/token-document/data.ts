import { TokenDocumentPF2e } from "@scene";

export interface TokenDataPF2e<T extends TokenDocumentPF2e = TokenDocumentPF2e> extends foundry.data.TokenData<T> {
    actorData: DeepPartial<NonNullable<T["actor"]>["_source"]>;
    flags: {
        pf2e: {
            [key: string]: unknown;
            linkToActorSize: boolean;
            autoscale: boolean;
        };
        [key: string]: Record<string, unknown>;
    };
}
