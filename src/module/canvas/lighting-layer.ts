export class LightingLayerPF2e extends LightingLayer {
    /** Set Unrestricted Global Vision based on token vision */
    override hasGlobalIllumination(): boolean {
        const coreHasGlobalLight = super.hasGlobalIllumination();
        if (!game.settings.get('pf2e', 'automation.rulesBasedVision')) return coreHasGlobalLight;

        const scene = canvas.scene;
        if (!scene) return coreHasGlobalLight;

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
