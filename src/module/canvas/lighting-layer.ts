import { AmbientLightPF2e } from './ambient-light';

export class LightingLayerPF2e extends LightingLayer<AmbientLightPF2e> {
    /** Set the perceived brightness of sourced lighting */
    override refresh(darkness?: number | null): void {
        if (canvas.sight.rulesBasedVision && canvas.tokens.controlled.some((token) => token.hasLowLightVision)) {
            for (const source of this.sources) {
                if (source.isDarkness) continue;
                const original = { dim: source.dim, bright: source.bright };
                source.dim = 0;
                source.bright = Math.max(original.dim, original.bright);
                source.ratio = 1;
            }
        }

        super.refresh(darkness);
    }

    protected override _onDarknessChange(darkness: number, prior: number): void {
        game.user.setPerceivedLightLevel({ defer: true });
        super._onDarknessChange(darkness, prior);
    }
}
