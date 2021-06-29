import { AmbientLightPF2e } from './ambient-light';

export class LightingLayerPF2e extends LightingLayer<AmbientLightPF2e> {
    /** Set Unrestricted Global Vision based on token vision */
    override hasGlobalIllumination(): boolean {
        const coreHasGlobalLight = super.hasGlobalIllumination();
        if (!(canvas.scene && canvas.sight.rulesBasedVision)) return coreHasGlobalLight;

        const tokens = (() => {
            const controlled = canvas.tokens.controlled.filter((token) => token.actor && token.observer);
            return controlled.length > 0
                ? controlled
                : canvas.tokens.placeables.filter(
                      (token) => token.actor && token.observer && token.actor === game.user.character,
                  );
        })();
        if (tokens.length === 0 && game.user.isGM) return true;

        return tokens.some((token) => {
            if (!(token.hasSight && token.actor)) return true;
            return token.actor.canSee;
        });
    }
}
