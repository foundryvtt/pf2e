import { AuraAppearanceData, AuraData } from "@actor/types.ts";
import { ItemTrait } from "@item/base/data/system.ts";
import { TokenAuraData } from "@scene/token-document/aura/index.ts";
import { isVideoFilePath } from "@util";
import type { EffectAreaSquare } from "../../effect-area-square.ts";
import type { TokenPF2e } from "../index.ts";
import { getAreaSquares } from "./util.ts";
import { IDestroyOptions } from "pixi.js";

/** Visual rendering of auras emanated by a token's actor */
class AuraRenderer extends PIXI.Graphics implements TokenAuraData {
    slug: string;

    /** The token associated with this aura */
    token: TokenPF2e;

    /** The radius of the aura in feet */
    radius: number;

    /** The aura radius from the center in pixels */
    radiusPixels: number;

    /** Traits associated with this aura: used to configure collision detection */
    traits: ItemTrait[];

    /** Border, highlight, and texture data */
    appearance: AuraAppearanceData;

    /** Standard line thickness for circle shape and label markers */
    static readonly LINE_THICKNESS = 3;

    border = new PIXI.Graphics();

    textureContainer: PIXI.Graphics | null = null;

    constructor(params: AuraRendererParams) {
        super();

        this.slug = params.slug;
        this.token = params.token;
        this.appearance = params.appearance;
        this.radius = params.radius;
        this.radiusPixels =
            0.5 * this.token.mechanicalBounds.width +
            (this.radius / (canvas.dimensions?.distance ?? 0)) * canvas.grid.size;
        this.traits = params.traits;
        this.addChild(this.border);
    }

    get bounds(): PIXI.Rectangle {
        const { token, radiusPixels } = this;
        const bounds = token.mechanicalBounds;
        return new PIXI.Rectangle(
            bounds.x - (radiusPixels - bounds.width / 2),
            bounds.y - (radiusPixels - bounds.width / 2),
            radiusPixels * 2,
            radiusPixels * 2,
        );
    }

    /** ID of `GridHighlight` container for this aura's token */
    get highlightLayer(): GridHighlight | null {
        return canvas.grid?.getHighlightLayer(this.token.highlightId) ?? null;
    }

    /** The squares covered by this aura */
    get squares(): EffectAreaSquare[] {
        return getAreaSquares(this);
    }

    /** Draw the aura's border and texture */
    async draw(showBorder: boolean): Promise<void> {
        // Auras draw at 0, 0. Shift it into the correct position here
        const { mechanicalBounds } = this.token;
        this.x = mechanicalBounds.width / 2;
        this.y = mechanicalBounds.height / 2;
        if (this.token.document.width < 1) {
            // Tiny tokens may not be at the top-left position. Adjust for that here.
            this.x += mechanicalBounds.x - this.token.x;
            this.y += mechanicalBounds.y - this.token.y;
        }

        this.#drawBorder();
        this.border.visible = showBorder;
        return this.#drawTexture();
    }

    /** Reposition this aura's texture after the token has moved. */
    repositionTexture(): void {
        if (this.textureContainer) {
            const { bounds, radiusPixels } = this;
            this.textureContainer.position.set(bounds.x + radiusPixels, bounds.y + radiusPixels);
        }
    }

    /** Draw the aura's border, making sure it's only ever drawn once. */
    #drawBorder(): void {
        const data = this.appearance.border;
        if (!data || this.border.geometry.graphicsData.length > 0) {
            return;
        }

        this.border.lineStyle(AuraRenderer.LINE_THICKNESS, data.color, data.alpha).drawCircle(0, 0, this.radiusPixels);
    }

    /** Draw the aura's texture, resizing the image/video over the area (applying adjustments to that if provided) */
    async #drawTexture(): Promise<void> {
        const data = this.appearance.texture;
        if (!data || this.token.isPreview || this.textureContainer) {
            return;
        }

        const texture = await (async (): Promise<PIXI.Texture | null> => {
            const maybeTexture = await loadTexture(data.src, { fallback: "icons/svg/hazard.svg" });
            if (!(maybeTexture instanceof PIXI.Texture)) return null;

            const globalVideo = isVideoFilePath(data.src) ? game.video.getVideoSource(maybeTexture) : null;
            if (globalVideo) {
                maybeTexture.destroy();
                const videoTexture = await game.video.cloneTexture(globalVideo);
                const video = game.video.getVideoSource(videoTexture) ?? globalVideo;
                video.playbackRate = data.playbackRate;
                const offset = data.loop ? Math.random() * video.duration : 0;
                game.video.play(video, { volume: 0, offset, loop: data.loop });
                return videoTexture;
            } else {
                return maybeTexture;
            }
        })();
        if (!texture) return;

        const { bounds, radiusPixels } = this;
        const radius = data.scale * radiusPixels;
        const diameter = radius * 2;
        const scale = { x: diameter / texture.width, y: diameter / texture.height };
        const matrix = new PIXI.Matrix(scale.x, undefined, undefined, scale.y, radius, radius);
        this.textureContainer = new PIXI.Graphics()
            .beginTextureFill({ texture, alpha: data.alpha, matrix })
            .drawCircle(0, 0, radius)
            .endFill();
        this.textureContainer.position.set(bounds.x + radiusPixels, bounds.y + radiusPixels);

        canvas.grid.grid.addChild(this.textureContainer);
    }

    /** Highlight the affected grid squares of this aura and indicate the radius */
    highlight(): void {
        const { dimensions } = canvas;
        if (!dimensions) return;

        this.#drawLabel();

        // For now, only highlight if there is an active combat
        const inEncounter = !!(this.token.actor?.isOfType("familiar")
            ? this.token.actor.master?.combatant?.encounter.active
            : this.token.combatant?.encounter.active);
        if (inEncounter) {
            const { highlightLayer } = this;
            if (!highlightLayer) return;

            for (const square of this.squares) {
                square.highlight(highlightLayer, this.appearance);
            }
        }
    }

    /** Add a numeric label and marker dot indicating the emanation radius */
    #drawLabel(): void {
        const style = CONFIG.canvasTextStyle.clone();
        const gridSize = canvas.dimensions?.size ?? 100;
        style.fontSize = Math.max(Math.round(gridSize * 0.36 * 12) / 12, 36);
        style.align = "center";

        const bounds = this.token.mechanicalBounds;
        const gridUnits = canvas.scene?.grid.units.trim() || game.system.gridUnits;
        const label = [this.radius, gridUnits].join("");
        const text = new PreciseText(label, style);
        const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
        const textOffset = Math.sqrt(style.fontSize);
        text.position.set(center.x + textOffset, center.y - this.radiusPixels - style.fontSize - textOffset);

        this.highlightLayer
            ?.beginFill(0x000000, 0.5)
            .lineStyle(AuraRenderer.LINE_THICKNESS, 0x000000)
            .drawCircle(center.x, center.y - this.radiusPixels, 6)
            .endFill()
            .addChild(text);
    }

    override destroy(options?: boolean | IDestroyOptions): void {
        super.destroy(options);

        if (this.textureContainer) {
            canvas.grid.grid.removeChild(this.textureContainer);
            if (!this.textureContainer.destroyed) this.textureContainer.destroy();
        }
    }
}

interface AuraRendererParams extends Omit<AuraData, "effects" | "traits"> {
    slug: string;
    token: TokenPF2e;
    traits: ItemTrait[];
}

export { AuraRenderer };
