import { TokenDocumentPF2e } from '@module/token-document';

export class TokenPF2e extends Token<TokenDocumentPF2e> {
    /** Token overrides from the actor */
    overrides: DeepPartial<foundry.data.TokenSource> = {};

    /** Used to track conditions and other token effects by game.pf2e.StatusEffects */
    statusEffectChanged = false;

    get hasOverrides(): boolean {
        return Object.keys(this.overrides).length > 0;
    }

    /**
     * Refresh the `EffectPanel` upon selecting a new token
     * @override
     */
    protected _onControl(options?: { releaseOthers?: boolean; pan?: boolean }) {
        super._onControl(options);

        game.pf2e?.effectPanel.refresh();
    }

    /**
     * Apply a set of changes from the actor
     * @param overrides The property overrides to be applied
     * @param moving    Whether this token is moving: setting as true indicates the client will make the Canvas updates.
     */
    applyOverrides(
        overrides: DeepPartial<foundry.data.TokenSource> = {},
        { moving = false }: { moving?: boolean } = {},
    ) {
        // Propagate any new or removed ActiveEffect overrides to the token
        this.overrides = overrides;
        this.data.reset();
        mergeObject(this.data, overrides, { insertKeys: false });

        if (moving) {
            this.updateSource({ defer: true });
        } else {
            this.updateSource();
            canvas.perception.schedule({
                lighting: { refresh: true },
                sight: { refresh: true },
            });
        }
    }

    /**
     * Persist token overrides during movement
     * @override
     */
    protected _onMovementFrame(dt: number, anim: TokenAnimationAttribute<this>[], config: TokenAnimationConfig) {
        if (this.hasOverrides) {
            this.applyOverrides(this.overrides, { moving: true });
        }
        super._onMovementFrame(dt, anim, config);
    }
}
