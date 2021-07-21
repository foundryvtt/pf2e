import { TokenPF2e } from './token';

export class TokenLayerPF2e extends TokenLayer<TokenPF2e> {
    /** Do any controlled tokens have darkvision or low-light vision (set by `TokenPF2e` instances)? */
    haveDarkvision = false;
    haveLowLightVision = false;
}
