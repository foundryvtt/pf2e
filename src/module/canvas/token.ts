import { CreaturePF2e } from '@actor';
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

    /** Is this token currently moving? */
    get isMoving(): boolean {
        return !!this._movement;
    }

    get hasLowLightVision(): boolean {
        return canvas.sight.rulesBasedVision && this.actor instanceof CreaturePF2e && this.actor.hasLowLightVision;
    }

    /**
     * Apply a set of changes from the actor
     * @param overrides The property overrides to be applied
     * @param moving    Whether this token is moving: setting as true indicates the client will make the Canvas updates.
     */
    applyOverrides(
        overrides: DeepPartial<foundry.data.TokenSource> = this.overrides,
        { setPerceived = true } = {},
    ): void {
        // Propagate any new or removed overrides to the token
        this.overrides = overrides;
        this.document.prepareData();
        mergeObject(this.data, overrides, { insertKeys: false });
        if (!this.isMoving) this.updateSource();
        if (setPerceived) game.user.setPerceivedLightLevel({ defer: this.isMoving });
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** Refresh vision and the `EffectPanel` upon selecting a token */
    protected override _onControl(options?: { releaseOthers?: boolean; pan?: boolean }): void {
        if (game.ready) game.pf2e.effectPanel.refresh();
        this.applyOverrides();
        super._onControl(options);
    }

    /** Refresh vision and the `EffectPanel` upon releasing control of a token */
    protected override _onRelease(options?: Record<string, unknown>) {
        game.pf2e.effectPanel.refresh();
        this.applyOverrides();
        super._onRelease(options);
    }

    /** Persist token overrides during movement */
    protected override _onMovementFrame(
        dt: number,
        anim: TokenAnimationAttribute<this>[],
        config: TokenAnimationConfig,
    ): void {
        this.applyOverrides();
        super._onMovementFrame(dt, anim, config);
    }
}
