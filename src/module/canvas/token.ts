import { TokenDocumentPF2e } from '@module/token-document';

export class TokenPF2e extends Token<TokenDocumentPF2e> {
    /** Token overrides from the actor */
    overrides: DeepPartial<foundry.data.TokenSource> = {};

    /** Used to track conditions and other token effects by game.pf2e.StatusEffects */
    statusEffectChanged = false;

    /** Is the user currently controlling this token? */
    get isControlled(): boolean {
        return this._controlled;
    }

    /** Is this token hidden from the current user's view? */
    get isHidden(): boolean {
        return this.data.hidden;
    }

    /**
     * Apply a set of changes from the actor
     * @param overrides The property overrides to be applied
     * @param moving    Whether this token is moving: setting as true indicates the client will make the Canvas updates.
     */
    applyOverrides(overrides: DeepPartial<foundry.data.TokenSource> = {}, { moving = false } = {}): void {
        // Propagate any new or removed overrides to the token
        this.overrides = overrides;
        this.data.reset();
        mergeObject(this.data, overrides, { insertKeys: false });

        if (moving) {
            game.user.setPerceivedLightLevel();
            this.updateSource({ defer: true });
        } else {
            game.user.setPerceivedLightLevel();
            game.user.setPerceivedLightEmissions({ defer: false });
        }
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** Refresh vision and the `EffectPanel` upon selecting a token */
    protected override _onControl(options?: { releaseOthers?: boolean; pan?: boolean }): void {
        if (game.ready) {
            game.pf2e.effectPanel.refresh();
            if (canvas.sight.rulesBasedVision) {
                const lightEmitters = canvas.tokens.placeables.filter((token) => token.emitsLight && token !== this);
                for (const token of [this, ...lightEmitters]) token.applyOverrides();
            }
        }
        super._onControl(options);
    }

    /** Refresh vision and the `EffectPanel` upon releasing control of a token */
    protected override _onRelease(options?: Record<string, unknown>) {
        game.pf2e.effectPanel.refresh();
        if (canvas.sight.rulesBasedVision) {
            const lightEmitters = canvas.tokens.placeables.filter((token) => token.emitsLight);
            for (const token of lightEmitters) token.applyOverrides();
            game.user.refreshSight();
        }
        super._onRelease(options);
    }

    /** Persist token overrides during movement */
    protected override _onMovementFrame(
        dt: number,
        anim: TokenAnimationAttribute<this>[],
        config: TokenAnimationConfig,
    ): void {
        this.applyOverrides(this.overrides, { moving: true });
        super._onMovementFrame(dt, anim, config);
    }
}
