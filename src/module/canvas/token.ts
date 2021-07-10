import { CreaturePF2e } from '@actor';
import { TokenDocumentPF2e } from '@module/scene/token-document';

export class TokenPF2e extends Token<TokenDocumentPF2e> {
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

    get emitsDarkness(): boolean {
        return this.data.brightLight < 0;
    }

    get hasLowLightVision(): boolean {
        return canvas.sight.rulesBasedVision && this.actor instanceof CreaturePF2e && this.actor.hasLowLightVision;
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** Refresh vision and the `EffectPanel` upon selecting a token */
    protected override _onControl(options?: { releaseOthers?: boolean; pan?: boolean }): void {
        if (game.ready) game.pf2e.effectPanel.refresh();
        game.user.setPerceivedLightLevel({ defer: true });
        super._onControl(options);
    }

    /** Refresh vision and the `EffectPanel` upon releasing control of a token */
    protected override _onRelease(options?: Record<string, unknown>) {
        game.pf2e.effectPanel.refresh();
        if (canvas.scene && canvas.sight.rulesBasedVision) {
            if (this.hasLowLightVision) this.updateSource({ defer: true });
            game.user.setPerceivedLightLevel({ defer: true });
        }
        super._onRelease(options);
    }
}
