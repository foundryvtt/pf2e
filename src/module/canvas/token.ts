import { CreaturePF2e } from '@actor';
import { VisionLevels } from '@actor/creature/data';
import { LightLevels } from '@module/scene';
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

    /** Return a bright radius of the greater of dim and bright radii if any controlled tokens have low-light vision */
    override get brightRadius(): number {
        if (!(canvas.scene && this.hasSight && canvas.sight.rulesBasedVision)) return super.brightRadius;

        const isDaylight = canvas.scene.getLightLevel() > LightLevels.DARKNESS;
        if (this.data.brightLight < 0 || isDaylight || this._controlled) return super.brightRadius;

        const lowLightActors = canvas.tokens.controlled.flatMap((token) => {
            return token.actor instanceof CreaturePF2e && token.actor.hasLowLightVision ? token.actor : [];
        });

        return lowLightActors.length > 0 ? Math.max(this.dimRadius, super.brightRadius) : super.brightRadius;
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
        this.setPerceivedLightLevel();
        this.setPerceivedLightEmissions();

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

    /** Set the perceived scene light level */
    setPerceivedLightLevel({ updateSource = false } = {}): void {
        if (!(canvas.scene && this.actor && this.observer && this.hasSight && canvas.sight.rulesBasedVision)) {
            return;
        }

        const actor = this.actor;
        const lightLevel = canvas.scene.getLightLevel();
        const perceivedBrightness = {
            [VisionLevels.BLINDED]: 0,
            [VisionLevels.NORMAL]: lightLevel,
            [VisionLevels.LOWLIGHT]: lightLevel > LightLevels.DARKNESS ? 1 : lightLevel,
            [VisionLevels.DARKVISION]: 1,
        }[actor.visionLevel];

        this.data.brightSight = perceivedBrightness > lightLevel ? perceivedBrightness * 500 : 0;
        if (updateSource) this.updateSource();
    }

    /** Set the perceive light level emitted by placed ambient lights and tokens */
    private setPerceivedLightEmissions(): void {
        canvas.lighting.initializeSources();
        const controlsAnyToken = canvas.tokens.controlled.length > 0;
        for (const token of canvas.tokens.placeables) {
            token.data.brightLight = (() => {
                const emitsLight = controlsAnyToken && token.emitsLight && !token.isControlled && !token.isHidden;
                if (!(emitsLight && this.actor instanceof CreaturePF2e)) {
                    console.debug('NORMAL LIGHT');
                    return token.data.brightLight;
                }
                const perceived = this.actor.hasLowLightVision
                    ? Math.max(token.data.brightLight, token.data.dimLight)
                    : token.data.brightLight;
                console.debug(`PERCEIVED LIGHT: ${perceived}`);
                return perceived;
            })();
            token.updateSource({ defer: true });
        }
        canvas.perception.schedule({
            lighting: { refresh: true },
            sight: { refresh: true },
        });
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** Refresh vision and the `EffectPanel` upon selecting a token */
    protected override _onControl(options?: { releaseOthers?: boolean; pan?: boolean }): void {
        if (game.ready) {
            game.pf2e.effectPanel.refresh();
            if (canvas.sight.rulesBasedVision) this.applyOverrides();
        }
        super._onControl(options);
    }

    /** Refresh vision and the `EffectPanel` upon releasing control of a token */
    protected override _onRelease(options?: Record<string, unknown>) {
        game.pf2e.effectPanel.refresh();
        const controlsNoTokens = canvas.tokens.controlled.length === 0;
        if (canvas.sight.rulesBasedVision && controlsNoTokens) this.applyOverrides();
        super._onRelease(options);
    }

    /** Persist token overrides during movement */
    protected override _onMovementFrame(
        dt: number,
        anim: TokenAnimationAttribute<this>[],
        config: TokenAnimationConfig,
    ) {
        this.applyOverrides(this.overrides, { moving: true });
        super._onMovementFrame(dt, anim, config);
    }
}
