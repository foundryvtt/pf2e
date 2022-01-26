import { TokenPF2e } from "../token";

export class TokenLayerPF2e<TToken extends TokenPF2e = TokenPF2e> extends TokenLayer<TToken> {
    constructor() {
        super();
        // Work around upstream bug (as of V9.242) in which active layer is checked for by constructor name lookup
        Object.defineProperty(this, "name", { value: "TokenLayer" });
    }
}
