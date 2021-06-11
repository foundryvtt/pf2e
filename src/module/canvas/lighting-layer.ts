import { CreaturePF2e } from '@actor';

export class LightingLayerPF2e extends LightingLayer {
    override hasGlobalIllumination(): boolean {
        const coreHasGlobalLight = super.hasGlobalIllumination();
        if (coreHasGlobalLight) return true;

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
        if (tokens.length > 0 && game.user.isGM) return true;

        return tokens.some((token) => {
            const actor = token.actor;
            if (!(token.hasSight && actor instanceof CreaturePF2e)) return true;
            return actor.canSee;
        });
    }
}
