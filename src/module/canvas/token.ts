import { CreaturePF2e } from '@actor';
import { TokenDocumentPF2e } from '@module/scene/token-document';

export class TokenPF2e extends Token<TokenDocumentPF2e> {
    /** Used to track conditions and other token effects by game.pf2e.StatusEffects */
    statusEffectChanged = false;

    /** Is the user currently controlling this token? */
    get isControlled(): boolean {
        return this._controlled;
    }

    /** Is this token currently moving? */
    get isMoving(): boolean {
        return !!this._movement;
    }

    /** Is this token emitting light with a negative value */
    get emitsDarkness(): boolean {
        return this.data.brightLight < 0;
    }

    /** Is rules-based vision enabled, and does this token's actor have low-light vision (inclusive of darkvision)? */
    get hasLowLightVision(): boolean {
        return canvas.sight.rulesBasedVision && this.actor instanceof CreaturePF2e && this.actor.hasLowLightVision;
    }

    /** Is rules-based vision enabled, and does this token's actor have darkvision vision? */
    get hasDarkvision(): boolean {
        return canvas.sight.rulesBasedVision && this.actor instanceof CreaturePF2e && this.actor.hasDarkvision;
    }

    /** Max the brightness emitted by this token's `PointSource` if any controlled token has low-light vision */
    override updateSource({ defer = false, deleted = false, noUpdateFog = false } = {}): void {
        if (!canvas.sight.hasLowLightVision) {
            return super.updateSource({ defer, deleted, noUpdateFog });
        }

        const original = { dim: this.data.dimLight, bright: this.data.brightLight };
        this.data.brightLight = Math.max(this.data.dimLight, this.data.brightLight);
        this.data.dimLight = 0;

        super.updateSource({ defer, deleted, noUpdateFog });

        this.data.dimLight = original.dim;
        this.data.brightLight = original.bright;
    }

    /** Refresh this token's image and size (usually after an actor update or override) */
    async redraw(): Promise<void> {
        const sizeChanged = this.w !== this.hitArea.width;
        const imageChanged = this.icon?.src !== this.data.img;

        if (sizeChanged || imageChanged) {
            const visible = this.visible;
            await this.draw();
            this.visible = visible;
        }
    }

    emitHoverIn() {
        this.emit('mouseover', { data: { object: this } });
    }

    emitHoverOut() {
        this.emit('mouseout', { data: { object: this } });
    }

    /** Set the icon src when drawing for later tracking */
    protected override async _drawIcon(): Promise<TokenImage> {
        const icon: TokenImage = await super._drawIcon();
        icon.src = this.data.img;
        return icon;
    }

    /** Prevent refresh before icon is set */
    override refresh(): this {
        if (this.icon?.transform) {
            return super.refresh();
        } else {
            const visible = this.visible;
            this.draw().then(() => {
                this.visible = visible;
                super.refresh();
            });
            return this;
        }
    }

    /** Prevent premature redraw of resource bar */
    protected override _drawBar(number: number, bar: PIXI.Graphics, data: TokenResourceData): void {
        if (bar.geometry) super._drawBar(number, bar, data);
    }

    /** Prevent premature redraw of border */
    protected override _refreshBorder(): void {
        if (this.border?.geometry) super._refreshBorder();
    }

    /** Prevent premature redraw of targeting reticle */
    protected override _refreshTarget(): void {
        if (this.target?.geometry) super._refreshTarget();
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** Refresh vision and the `EffectPanel` */
    protected override _onControl(options?: { releaseOthers?: boolean; pan?: boolean }): void {
        if (game.ready) game.pf2e.effectPanel.refresh();
        if (this.hasLowLightVision) canvas.lighting.setPerceivedLightLevel();

        super._onControl(options);
    }

    /** Refresh vision and the `EffectPanel` */
    protected override _onRelease(options?: Record<string, unknown>) {
        game.pf2e.effectPanel.refresh();
        if (this.hasLowLightVision) canvas.lighting.setPerceivedLightLevel();

        super._onRelease(options);
    }
}

interface TokenImage extends PIXI.Sprite {
    src?: VideoPath;
}

export interface TokenPF2e extends Token<TokenDocumentPF2e> {
    icon: TokenImage;
}
