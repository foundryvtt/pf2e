import { LightLevels, ScenePF2e } from '@module/scene';
import { LightingLayerPF2e } from './lighting-layer';

export class AmbientLightPF2e extends AmbientLight {
    /** Return a bright radius of the greater of dim and bright radii if any controlled tokens have low-light vision */
    override get brightRadius(): number {
        if (!(canvas.scene && canvas.sight.rulesBasedVision)) return super.brightRadius;

        const isDaylight = canvas.scene.getLightLevel() > LightLevels.DARKNESS;
        if (this.source.isDarkness || isDaylight) return super.brightRadius;

        const lowLightTokens = canvas.tokens.controlled.filter((token) => token.hasLowLightVision);

        return lowLightTokens.length > 0 ? Math.max(this.dimRadius, super.brightRadius) : super.brightRadius;
    }
}

export interface AmbientLightPF2e {
    get layer(): LightingLayerPF2e;
}

export interface AmbientLightDocumentPF2e extends AmbientLightDocument {
    parent: ScenePF2e | null;
}
