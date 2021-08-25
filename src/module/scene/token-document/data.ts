import { TokenDocumentPF2e } from "@scene";

export interface TokenDataPF2e<T extends TokenDocumentPF2e> extends foundry.data.TokenData<T> {
    flags: {
        pf2e: {
            [key: string]: unknown;
            linkToActorSize: boolean;
        };
        [key: string]: Record<string, unknown>;
    };
}
