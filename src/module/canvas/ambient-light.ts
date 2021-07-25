import { AmbientLightDocumentPF2e } from '@module/scene';
import { LightingLayerPF2e } from './lighting-layer';

export class AmbientLightPF2e extends AmbientLight<AmbientLightDocumentPF2e> {
    /** Return a bright radius of the greater of dim and bright radii if any controlled tokens have low-light vision */
    override get brightRadius(): number {
        const ignoreLight = this.source.isDarkness || !this.visible;
        if (!canvas.sight.rulesBasedVision || ignoreLight) {
            return super.brightRadius;
        }

        const lowLightTokens = canvas.tokens.controlled.filter((token) => token.hasLowLightVision);
        return lowLightTokens.length > 0 ? Math.max(this.dimRadius, super.brightRadius) : super.brightRadius;
    }

    /** Is this light actually a source of darkness? */
    get isDarkness() {
        return this.source.isDarkness;
    }
}

export interface AmbientLightPF2e {
    get layer(): LightingLayerPF2e<this>;
}
