import { CreaturePF2e } from '@actor';
import { VisionLevels } from '@actor/creature/data';
import { LightLevels } from '@module/scene';
import { TokenDocumentPF2e } from '@module/token-document';

export class TokenPF2e extends Token<TokenDocumentPF2e> {
    /** Token overrides from the actor */
    overrides: DeepPartial<foundry.data.TokenSource> = {};

    /** Used to track conditions and other token effects by game.pf2e.StatusEffects */
    statusEffectChanged = false;

    setPerceivedLightLevel(): void {
        const rulesBasedVision = game.settings.get('pf2e', 'automation.rulesBasedVision');
        const actorCanSee = this.observer && !!this.actor?.canSee;
        if (!(canvas.scene && rulesBasedVision && actorCanSee && this.actor instanceof CreaturePF2e)) {
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

        if (perceivedBrightness > lightLevel) {
            this.data.brightSight = perceivedBrightness * 500;
        }
    }

    /** Refresh the `EffectPanel` upon selecting a new token */
    protected override _onControl(options?: { releaseOthers?: boolean; pan?: boolean }): void {
        if (game.ready && this.observer) {
            this.setPerceivedLightLevel();
            game.pf2e.effectPanel.refresh();
        }
        super._onControl(options);
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
        this.setPerceivedLightLevel();
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
