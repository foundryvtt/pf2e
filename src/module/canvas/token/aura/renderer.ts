import { AuraAppearanceData, AuraData } from "@actor/types.ts";
import { ItemTrait } from "@item/data/base.ts";
import { TokenAuraData } from "@scene/token-document/aura/index.ts";
import type { EffectAreaSquare } from "../../effect-area-square.ts";
import type { TokenPF2e } from "../index.ts";
import { getAreaSquares } from "./util.ts";
import { isVideoFilePath } from "@util";

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
    traits: Set<ItemTrait>;

    /** Border, highlight, and texture data */
    appearance: AuraAppearanceData;

    /** Standard line thickness for circle shape and label markers */
    static readonly LINE_THICKNESS = 3;

    #border = new PIXI.Graphics();

    texture: PIXI.Texture | null = null;

    constructor(params: AuraRendererParams) {
        super();

        this.slug = params.slug;
        this.token = params.token;
        this.appearance = params.appearance;
        this.radius = params.radius;
        this.radiusPixels = 0.5 * this.token.w + (this.radius / (canvas.dimensions?.distance ?? 0)) * canvas.grid.size;
        this.traits = new Set(params.traits);
        this.addChild(this.#border);
    }

    get bounds(): PIXI.Rectangle {
        const { token, radiusPixels } = this;

        return new PIXI.Rectangle(
            token.bounds.x - (radiusPixels - token.bounds.width / 2),
            token.bounds.y - (radiusPixels - token.bounds.width / 2),
            radiusPixels * 2,
            radiusPixels * 2
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

    /** Whether this aura's parent token is in an active encounter */
    get inEncounter(): boolean {
        return !!this.token.combatant?.encounter.started;
    }

    /** Draw the aura's border and texture */
    draw(showBorder: boolean): void {
        this.#drawBorder();
        this.#border.visible = showBorder;
        this.#drawTexture();
    }

    /** Draw the aura's border, making sure it's only ever drawn once. */
    #drawBorder(): void {
        const data = this.appearance.border;
        if (!data || this.#border.geometry.graphicsData.length > 0) {
            return;
        }

        const [x, y, radius] = [this.token.w / 2, this.token.h / 2, this.radiusPixels];
        this.#border.lineStyle(AuraRenderer.LINE_THICKNESS, data.color, data.alpha).drawCircle(x, y, radius);
    }

    /** Draw the aura's texture, resizing the image/video over the area (applying adjustments to that if provided) */
    async #drawTexture(): Promise<void> {
        const data = this.appearance.texture;
        if (!data || this.token.isPreview || this.geometry.drawCalls.length > 0) {
            return;
        }

        const maybeTexture = await loadTexture(data.src, { fallback: "icons/svg/hazard.svg" });
        this.texture = maybeTexture instanceof PIXI.Texture ? maybeTexture : null;
        const video = isVideoFilePath(data.src) && this.texture ? game.video.getVideoSource(this.texture) : null;
        if (video instanceof HTMLVideoElement) {
            this.texture?.destroy();
            this.texture = await game.video.cloneTexture(video);
            const fromTexture = game.video.getVideoSource(this.texture) ?? video;
            game.video.play(fromTexture, { volume: 0, offset: Math.random() * fromTexture.duration });
        }

        if (this.texture) {
            const radius = data.scale * this.radiusPixels;
            const diameter = radius * 2;
            const scale = { x: diameter / this.texture.width, y: diameter / this.texture.height };
            const center = { x: Math.round(this.token.w / 2), y: Math.round(this.token.h / 2) };
            const translation = data.translation ?? { x: radius + center.x, y: radius + center.y };
            const matrix = new PIXI.Matrix(scale.x, undefined, undefined, scale.y, translation.x, translation.y);
            this.beginTextureFill({ texture: this.texture, alpha: data.alpha, matrix })
                .drawCircle(center.x, center.y, radius)
                .endFill();
        }
    }

    /** Highlight the affected grid squares of this aura and indicate the radius */
    highlight(): void {
        const { dimensions } = canvas;
        if (!dimensions) return;

        this.#drawLabel();

        // For now, only highlight if there is an active combat
        if (this.inEncounter) {
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

        const gridUnits = canvas.scene?.grid.units.trim() || game.system.gridUnits;
        const label = [this.radius, gridUnits].join("");
        const text = new PreciseText(label, style);
        const { center } = this.token;
        const textOffset = Math.sqrt(style.fontSize);
        text.position.set(center.x + textOffset, center.y - this.radiusPixels - style.fontSize - textOffset);

        this.highlightLayer
            ?.beginFill(0x000000, 0.5)
            .lineStyle(AuraRenderer.LINE_THICKNESS, 0x000000)
            .drawCircle(center.x, center.y - this.radiusPixels, 6)
            .endFill()
            .addChild(text);
    }
}

interface AuraRendererParams extends Omit<AuraData, "effects" | "traits"> {
    slug: string;
    token: TokenPF2e;
    traits: Set<ItemTrait>;
}

export { AuraRenderer };
