import { CreaturePF2e } from '@actor';
import { LightLevels } from '@module/scene';
import { LightingLayerPF2e } from './lighting-layer';

export class AmbientLightPF2e extends AmbientLight {
    /** Return a dim radius of 0 if any controlled tokens have low-light vision */
    override get dimRadius(): number {
        if (!(canvas.scene && canvas.sight.rulesBasedVision)) return super.dimRadius;

        const isDaylight = canvas.scene.getLightLevel() > LightLevels.DARKNESS;
        if (this.source.isDarkness || isDaylight) return super.dimRadius;

        const lowLightActors = canvas.tokens.controlled.flatMap((token) => {
            return token.actor instanceof CreaturePF2e && token.actor.hasLowLightVision ? token.actor : [];
        });
        return lowLightActors.length > 0 ? 0 : super.dimRadius;
    }

    /** Return a bright radius to the greater of dim and bright radii if any controlled tokens have low-light vision */
    override get brightRadius(): number {
        if (!(canvas.scene && canvas.sight.rulesBasedVision)) return super.brightRadius;

        const isDaylight = canvas.scene.getLightLevel() > LightLevels.DARKNESS;
        if (this.source.isDarkness || isDaylight) return super.brightRadius;

        const lowLightActors = canvas.tokens.controlled.flatMap((token) => {
            return token.actor instanceof CreaturePF2e && token.actor.hasLowLightVision ? token.actor : [];
        });

        return lowLightActors.length > 0 ? Math.max(super.dimRadius, super.brightRadius) : super.brightRadius;
    }
}

export interface AmbientLightPF2e {
    get layer(): LightingLayerPF2e;
}
