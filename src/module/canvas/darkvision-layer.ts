import { CharacterPF2e } from '@actor';
import { LightLevels } from '@module/scene/data';

export class DarkvisionLayerPF2e extends CanvasLayer {
    /** The darkvision (monochrome) filter applied to the BackgroundLayer */
    private filter = new PIXI.filters.ColorMatrixFilter();

    /** Somewhat like a mask, except parts of the background are redrawn over the darkvision filter */
    private notMask!: PIXI.Sprite;

    static documentName = 'Darkvision';

    static override get layerOptions(): CanvasLayerOptions {
        return foundry.utils.mergeObject(super.layerOptions, {
            name: 'darkvision',
            zIndex: 1,
            controllableObjects: false,
            rotatableObjects: false,
        });
    }

    get isEnabled(): boolean {
        return canvas.sight.rulesBasedVision && game.user.settings.darkvisionFilter;
    }

    override getZIndex() {
        return canvas.background.getZIndex() + 1;
    }

    override async draw(): Promise<this> {
        await super.draw();
        this.filter.enabled = false;

        if (this.isEnabled && canvas.ready) {
            const texture = canvas.background.bg.texture;
            this.notMask = this.addChild(PIXI.Sprite.from(texture));
            for (const layer of [canvas.background, canvas.foreground]) {
                layer.filters ??= [];
                if (!layer.filters.includes(this.filter)) {
                    layer.filters.push(this.filter);
                }
            }
            this.refresh({ drawMask: true });
        }

        return this;
    }

    refresh({ darkness = canvas.lighting.darknessLevel, drawMask = false } = {}): void {
        if (!this.isEnabled) return;

        if (drawMask) this.drawMask();
        const lightLevel = 1 - darkness;
        if (lightLevel <= LightLevels.DARKNESS && canvas.sight.hasDarkvision) {
            const saturation = this.getSaturation(lightLevel);
            this.filter.saturate(saturation);
            this.visible = true;
            this.filter.enabled = true;
        } else {
            this.visible = false;
            this.filter.enabled = false;
        }
    }

    private drawMask(): void {
        const circles = new PIXI.Graphics().beginFill(0xffffff);
        for (const source of canvas.lighting.sources) {
            circles.drawPolygon(source.fov);
        }
        circles.endFill();
        const blur = new PIXI.filters.BlurFilter(canvas.blurDistance);
        circles.filters = [blur];
        const texture = canvas.app.renderer.generateTexture(
            circles,
            PIXI.SCALE_MODES.NEAREST,
            1,
            canvas.dimensions.sceneRect,
        );
        const mask = new PIXI.Sprite(texture);
        this.notMask.removeChildren();
        this.notMask.mask = this.notMask.addChild(mask);
    }

    private getSaturation(lightLevel: number): number {
        const fetchlingSight = canvas.tokens.controlled
            .flatMap((token) => token.actor ?? [])
            .some((actor) => actor instanceof CharacterPF2e && actor.ancestry?.slug === 'fetchling');
        const monochrome = Math.clamped(4 * lightLevel - 1, -1, 0);
        const saturation = fetchlingSight ? -1 * monochrome : monochrome;
        console.debug(`Setting darkvision filter saturation to ${saturation}`);

        return saturation;
    }
}
